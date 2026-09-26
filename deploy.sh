#!/bin/bash
# Deploy GingerMint v2 di server: backup DB → (opsional) upload ke S3 → git pull
# → bun install (kalau perlu) → build → restart PM2 → health check.
# Jalankan dari root project: ./deploy.sh
# Migration tidak perlu dijalankan terpisah — app menjalankannya saat startup.

cd "$(dirname "$0")" || exit 1

STEP_DELAY=1
PM2_COOLDOWN=3
PM2_APP="gingermintv2"

# Kalau S3 check gagal (misconfig/down), tetap lanjutkan deploy? true = lanjut (default).
# Set ke false kalau mau deploy berhenti ketika upload S3 gagal.
S3_CHECK_SOFT_FAIL=true

# Ambil nilai dari .env kalau belum ada di environment.
# Tidak pakai `source .env` supaya value yang tidak di-quote tidak dieksekusi bash.
env_get() {
  [ -f ".env" ] || return 0
  grep -E "^$1=" ".env" | tail -1 | cut -d'=' -f2- | sed -E 's/^["'"'"'](.*)["'"'"']$/\1/'
}
: "${DATABASE_PATH:=$(env_get DATABASE_PATH)}"
: "${PORT:=$(env_get PORT)}"
: "${WASABI_BUCKET:=$(env_get WASABI_BUCKET)}"
: "${WASABI_ACCESS_KEY:=$(env_get WASABI_ACCESS_KEY)}"
: "${WASABI_SECRET_KEY:=$(env_get WASABI_SECRET_KEY)}"
: "${WASABI_REGION:=$(env_get WASABI_REGION)}"
: "${WASABI_ENDPOINT:=$(env_get WASABI_ENDPOINT)}"

DATABASE_PATH="${DATABASE_PATH:-./data/app.sqlite}"
PORT="${PORT:-4000}"
BACKUP_DIR="${BACKUP_DIR:-$HOME/gingermint/data/backup}"

TIMESTAMP=$(date +"%Y%m%d-%H%M%S")
SRC_DB="$DATABASE_PATH"
DEST_DB="$BACKUP_DIR/app-$TIMESTAMP.sqlite"

echo "=== [1] Backup SQLite (safe WAL backup) ==="
sleep $STEP_DELAY

if [ -f "$SRC_DB" ]; then
  mkdir -p "$BACKUP_DIR"

  # VACUUM INTO aman untuk WAL mode dan menghasilkan satu file SQLite bersih
  # (tanpa -wal/-shm) yang bisa langsung di-restore. Pakai bun:sqlite supaya
  # tidak butuh CLI sqlite3 di server.
  bun -e 'import { Database } from "bun:sqlite";
    const db = new Database(process.argv[1]);
    db.run("VACUUM INTO ?", [process.argv[2]]);' "$SRC_DB" "$DEST_DB" || {
    echo "Backup SQLite gagal"
    exit 1
  }
  echo "Backup sukses: $DEST_DB"
else
  # Deploy pertama kali: database belum ada, akan dibuat saat app start.
  echo "Database belum ada ($SRC_DB) — skip backup"
  DEST_DB=""
fi

echo "=== [2] Upload backup ke S3 (opsional, Wasabi) ==="
sleep $STEP_DELAY

S3_BACKUP_OK=false
if [ -z "$DEST_DB" ]; then
  S3_BACKUP_OK=true
  echo "[S3 CHECK] SKIP — tidak ada file backup"
elif [ -z "$WASABI_BUCKET" ] || [ -z "$WASABI_ACCESS_KEY" ] || [ -z "$WASABI_SECRET_KEY" ]; then
  echo "[S3 CHECK] SKIP — WASABI_BUCKET/WASABI_ACCESS_KEY/WASABI_SECRET_KEY belum diset"
elif ! command -v aws &>/dev/null; then
  echo "[S3 CHECK] SKIP — aws CLI tidak ditemukan (install: pip install awscli)"
else
  S3_KEY="backup_db/gingermint/$(basename "$DEST_DB")"
  WASABI_REGION="${WASABI_REGION:-ap-southeast-1}"
  WASABI_ENDPOINT="${WASABI_ENDPOINT:-https://s3.ap-southeast-1.wasabisys.com}"

  export AWS_ACCESS_KEY_ID="$WASABI_ACCESS_KEY"
  export AWS_SECRET_ACCESS_KEY="$WASABI_SECRET_KEY"

  if aws s3 cp "$DEST_DB" "s3://$WASABI_BUCKET/$S3_KEY" \
      --endpoint-url "$WASABI_ENDPOINT" \
      --region "$WASABI_REGION" \
      --no-progress \
    && aws s3api head-object \
      --bucket "$WASABI_BUCKET" \
      --key "$S3_KEY" \
      --endpoint-url "$WASABI_ENDPOINT" \
      --region "$WASABI_REGION" >/dev/null 2>&1
  then
    S3_BACKUP_OK=true
    echo "[S3 CHECK] OK — upload & verifikasi berhasil: s3://$WASABI_BUCKET/$S3_KEY"
  else
    echo "[S3 CHECK] GAGAL — upload backup ke S3 tidak berfungsi, cek kredensial/bucket Wasabi"
  fi
fi

if [ "$S3_BACKUP_OK" != "true" ] && [ "$S3_CHECK_SOFT_FAIL" != "true" ]; then
  echo "Deployment dihentikan karena S3 check gagal (S3_CHECK_SOFT_FAIL=false)"
  exit 1
fi

echo "=== [3] Git pull ==="
sleep $STEP_DELAY

# Perubahan lokal yang belum di-commit di-stash dulu (tidak dibuang) supaya
# `git pull` tidak berhenti dengan "Aborting".
STASHED=false
if [ -n "$(git status --porcelain)" ]; then
  STASH_LABEL="deploy-autostash-$(date +%Y%m%d-%H%M%S)"
  echo "Ada perubahan lokal yang belum di-commit, di-stash dulu sebagai: $STASH_LABEL"
  if git stash push -u -m "$STASH_LABEL"; then
    STASHED=true
  else
    echo "Gagal stash perubahan lokal, deploy dihentikan"
    exit 1
  fi
fi

OLD_HEAD=$(git rev-parse HEAD)

GIT_OUTPUT=$(git pull) || { echo "$GIT_OUTPUT"; echo "git pull gagal"; exit 1; }
echo "$GIT_OUTPUT"

NEW_HEAD=$(git rev-parse HEAD)

if [ "$STASHED" = "true" ]; then
  echo "Perubahan lokal sebelumnya diamankan di git stash (\"$STASH_LABEL\") — TIDAK otomatis diterapkan ulang."
  echo "Cek/kembalikan manual kalau perlu: git stash list  |  git stash show -p stash@{0}"
fi

# Tetap lanjut kalau app belum pernah di-build / belum terdaftar di PM2 (deploy pertama).
FIRST_DEPLOY=false
if [ ! -d dist ] || ! pm2 describe "$PM2_APP" &>/dev/null; then
  FIRST_DEPLOY=true
fi

if [ "$OLD_HEAD" = "$NEW_HEAD" ] && [ "$STASHED" != "true" ] && [ "$FIRST_DEPLOY" != "true" ]; then
  echo "Tidak ada update kode, proses dihentikan"
  exit 0
fi

echo "=== [4] Kode terupdate ($OLD_HEAD → $NEW_HEAD) ==="
sleep $STEP_DELAY

echo "=== [5] Install dependencies (bun) ==="
sleep $STEP_DELAY

# Install hanya kalau node_modules belum ada, atau ada commit baru yang
# menyentuh package.json/bun.lock.
NEEDS_INSTALL=false
if [ ! -d node_modules ]; then
  NEEDS_INSTALL=true
  echo "node_modules belum ada — install tetap dijalankan"
elif [ "$OLD_HEAD" != "$NEW_HEAD" ] && \
     git diff --name-only "$OLD_HEAD" "$NEW_HEAD" -- package.json bun.lock | grep -q .; then
  NEEDS_INSTALL=true
fi

if [ "$NEEDS_INSTALL" != "true" ]; then
  echo "package.json/bun.lock tidak berubah — skip bun install"
else
  if grep -lE '^(<<<<<<<|=======|>>>>>>>)' package.json bun.lock 2>/dev/null | grep -q .; then
    echo "Konflik git terdeteksi di package.json/bun.lock — deploy dihentikan, resolve manual dulu"
    exit 1
  fi

  # --frozen-lockfile = reproducible; kalau lockfile tidak sinkron dengan
  # package.json, fallback ke bun install biasa daripada deploy berhenti total.
  if bun install --frozen-lockfile; then
    echo "bun install berhasil"
  else
    echo "bun install --frozen-lockfile gagal (bun.lock tidak sinkron?) — mencoba bun install..."
    bun install || { echo "bun install gagal"; exit 1; }
    echo "bun install berhasil (lockfile disinkronkan ulang)"
  fi
fi

echo "=== [6] Running build ==="
sleep $STEP_DELAY
bun run build || { echo "bun run build gagal"; exit 1; }

echo "=== [7] Cooldown sebelum PM2 restart (${PM2_COOLDOWN}s) ==="
sleep $PM2_COOLDOWN

echo "=== [8] Restarting PM2 (migration jalan otomatis saat startup) ==="
if pm2 describe "$PM2_APP" &>/dev/null; then
  pm2 restart "$PM2_APP" --update-env || { echo "pm2 restart gagal"; exit 1; }
else
  echo "App '$PM2_APP' belum terdaftar di PM2 — start dari ecosystem.config.cjs"
  pm2 start ecosystem.config.cjs || { echo "pm2 start gagal"; exit 1; }
  pm2 save
fi

echo "=== [9] Health check (http://localhost:$PORT/health) ==="
for i in $(seq 1 15); do
  if curl -fsS "http://localhost:$PORT/health" >/dev/null 2>&1; then
    echo "Health check OK"
    echo "=== Deployment selesai ==="
    exit 0
  fi
  sleep 2
done

echo "Health check GAGAL — app tidak merespons di port $PORT. Cek: pm2 logs $PM2_APP"
[ -n "$DEST_DB" ] && echo "Backup database sebelum deploy: $DEST_DB"
exit 1
