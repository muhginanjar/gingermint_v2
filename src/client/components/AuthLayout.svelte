<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Brand from './Brand.svelte'

  let { children }: { children: import('svelte').Snippet } = $props()
</script>

<main class="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-b from-tint-home via-background to-background p-6">
  <div class="pointer-events-none absolute -top-32 left-1/2 h-72 w-[36rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl" aria-hidden="true"></div>
  <div class="pointer-events-none absolute -bottom-40 -left-24 h-80 w-80 rounded-full bg-ginger/10 blur-3xl" aria-hidden="true"></div>

  <div class="relative w-full max-w-[440px]">
    <div class="rounded-2xl border bg-card p-8 shadow-sheet sm:p-10">
      <div class="mb-8">
        <Link href="/" aria-label="GingerMint home" class="inline-flex rounded-md"><Brand size={32} wordmark /></Link>
      </div>
      {@render children()}
    </div>
    <p class="mt-6 text-center text-xs text-muted-foreground">One place for every project.</p>
  </div>
</main>
