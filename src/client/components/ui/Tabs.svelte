<script lang="ts">
  /** Segmented control (shadcn Tabs list styling). */
  import { cn } from '../../lib/cn'

  let {
    items,
    value = $bindable(''),
    onchange,
    class: className = '',
    label = 'View',
  }: {
    items: { value: string; label: string; count?: number }[]
    value?: string
    onchange?: (v: string) => void
    class?: string
    label?: string
  } = $props()
</script>

<div role="tablist" aria-label={label} class={cn('inline-flex h-8 items-center rounded-md bg-muted p-0.5 text-muted-foreground', className)}>
  {#each items as item (item.value)}
    <button
      type="button"
      role="tab"
      aria-selected={value === item.value}
      onclick={() => {
        value = item.value
        onchange?.(item.value)
      }}
      class={cn(
        'inline-flex h-7 items-center justify-center gap-1 whitespace-nowrap rounded-[5px] px-2.5 text-[13px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
        value === item.value ? 'bg-card text-foreground shadow-sm' : 'hover:text-foreground',
      )}
    >
      {item.label}{#if item.count !== undefined}<span class="text-xs opacity-60">{item.count}</span>{/if}
    </button>
  {/each}
</div>
