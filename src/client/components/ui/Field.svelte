<script lang="ts">
  /** Label + control + error message. */
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/cn'
  import { labelClass } from '../../lib/variants'

  let {
    id,
    label,
    error,
    hint,
    class: className = '',
    children,
  }: { id?: string; label?: string; error?: string; hint?: string; class?: string; children: Snippet } = $props()
</script>

<div class={cn('grid gap-1.5', className)}>
  {#if label}<label for={id} class={labelClass}>{label}</label>{/if}
  {@render children()}
  {#if error}
    <p class="text-[13px] font-medium text-destructive" role="alert">{error}</p>
  {:else if hint}
    <p class="text-[13px] text-muted-foreground">{hint}</p>
  {/if}
</div>
