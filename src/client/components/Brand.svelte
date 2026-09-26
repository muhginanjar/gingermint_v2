<script lang="ts">
  /** GingerMint mark: a mint leaf on a deep-green tile, optional wordmark. */
  import { cn } from '../lib/cn'
  let { size = 28, wordmark = false, class: className = '' }: { size?: number; wordmark?: boolean; class?: string } = $props()
</script>

<span class={cn('inline-flex items-center gap-2', className)}>
  <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
    <rect width="32" height="32" rx="9" fill="oklch(0.42 0.1 165)" />
    <path d="M8.5 21.5C8.5 14 13 8.5 23.5 8.5c0 10.5-5.5 15-13 15" fill="oklch(0.86 0.12 160)" />
    <path d="M9 23.5c3.2-4.6 6.6-7.8 10.8-10.3" stroke="oklch(0.42 0.1 165)" stroke-width="1.8" stroke-linecap="round" fill="none" />
    <circle cx="23.5" cy="23.5" r="3" fill="oklch(0.7 0.17 45)" />
  </svg>
  {#if wordmark}<span class="text-[15px] font-extrabold tracking-tight">GingerMint</span>{/if}
</span>
