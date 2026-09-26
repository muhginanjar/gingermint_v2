<script lang="ts">
  /** Renders a lucide IconNode (see lib/icons.ts). Decorative unless `label` is set. */
  import type { IconNode } from 'lucide'
  import { cn } from '../../lib/cn'

  let {
    icon,
    size = 16,
    strokeWidth = 2,
    label,
    class: className = '',
  }: { icon: IconNode; size?: number; strokeWidth?: number; label?: string; class?: string } = $props()
</script>

<svg
  xmlns="http://www.w3.org/2000/svg"
  width={size}
  height={size}
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  stroke-width={strokeWidth}
  stroke-linecap="round"
  stroke-linejoin="round"
  class={cn('shrink-0', className)}
  aria-hidden={label ? undefined : 'true'}
  aria-label={label}
  role={label ? 'img' : undefined}
>
  {#each icon as [tag, attrs], i (i)}
    <svelte:element this={tag} {...attrs} />
  {/each}
</svg>
