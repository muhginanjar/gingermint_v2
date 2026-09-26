<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import Brand from './Brand.svelte'

  let { children }: { children: import('svelte').Snippet } = $props()
</script>

<main class="flex min-h-screen items-center justify-center bg-tint-home p-6">
  <div class="w-full max-w-[400px] rounded-xl border bg-card p-8 shadow-sheet">
    <div class="mb-6 flex justify-center">
      <Link href="/" aria-label="GingerMint home"><Brand size={36} wordmark /></Link>
    </div>
    {@render children()}
  </div>
</main>
