<script lang="ts">
  /**
   * Anchored popover (shadcn Popover styling). Closes on outside click and
   * Escape. `trigger` receives { toggle, open }, content receives { close }.
   */
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/cn'

  let {
    open = $bindable(false),
    align = 'start',
    side = 'bottom',
    class: className = '',
    contentClass = '',
    trigger,
    children,
  }: {
    open?: boolean
    align?: 'start' | 'end' | 'center'
    side?: 'bottom' | 'top'
    class?: string
    contentClass?: string
    trigger: Snippet<[{ toggle: () => void; open: boolean }]>
    children: Snippet<[{ close: () => void }]>
  } = $props()

  let root = $state<HTMLDivElement | null>(null)
  const toggle = () => (open = !open)
  const close = () => (open = false)

  $effect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) open = false
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        open = false
        e.stopPropagation()
      }
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  })
</script>

<div class={cn('relative inline-block', className)} bind:this={root}>
  {@render trigger({ toggle, open })}
  {#if open}
    <div
      class={cn(
        'absolute z-50 min-w-[12rem] rounded-md border bg-popover p-1 text-popover-foreground shadow-lg outline-none animate-[menu-in_120ms_ease]',
        side === 'bottom' ? 'top-full mt-1.5' : 'bottom-full mb-2',
        align === 'end' ? 'right-0' : align === 'center' ? 'left-1/2 -translate-x-1/2' : 'left-0',
        contentClass,
      )}
    >
      {@render children({ close })}
    </div>
  {/if}
</div>
