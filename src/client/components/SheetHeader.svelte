<script lang="ts">
  /** Big bold page title with optional actions (right) and controls row (below). */
  import type { Snippet } from 'svelte'
  import { cn } from '../lib/cn'

  let {
    title,
    subtitle,
    center = false,
    actions,
    controls,
    before,
  }: { title: string; subtitle?: string; center?: boolean; actions?: Snippet; controls?: Snippet; before?: Snippet } = $props()
</script>

<header class={cn('mb-6', center && 'text-center')}>
  {@render before?.()}
  <div class={cn('flex flex-wrap items-start gap-3', center ? 'justify-center' : 'justify-between')}>
    <div class="min-w-0">
      <h1 class="text-[28px] font-black leading-tight tracking-tight sm:text-[34px]">{title}</h1>
      {#if subtitle}<p class="mt-1 text-muted-foreground">{subtitle}</p>{/if}
    </div>
    {#if actions && !center}<div class="flex flex-wrap items-center gap-2">{@render actions()}</div>{/if}
  </div>
  {#if actions && center}<div class="mt-3 flex flex-wrap items-center justify-center gap-2">{@render actions()}</div>{/if}
  {#if controls}<div class={cn('mt-4 flex flex-wrap items-center gap-2', center && 'justify-center')}>{@render controls()}</div>{/if}
</header>
