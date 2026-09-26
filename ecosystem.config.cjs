// PM2 process file — `pm2 start ecosystem.config.cjs`.
// Keep it to ONE instance in fork mode: SQLite is a single-writer database and
// the Automatic Check-ins scheduler runs in-process (more instances = duplicate
// check-in prompts). PORT, APP_URL and secrets come from .env (Bun loads it
// from `cwd`); anything set in `env` below overrides .env.
module.exports = {
	apps: [
		{
			name: "gingermintv2",
			script: "bun",
			args: "run src/index.ts",
			interpreter: "none",
			cwd: __dirname,
			exec_mode: "fork",
			instances: 1,
			autorestart: true,
			max_memory_restart: "512M",
			kill_timeout: 5000,
			env: {
				NODE_ENV: "production",
			},
		},
	],
};
