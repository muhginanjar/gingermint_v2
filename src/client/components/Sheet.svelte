<script lang="ts">
  /** The white "sheet of paper" that sits centered on the tinted canvas. */
  import type { Snippet } from 'svelte'
  import { cn } from '../lib/cn'
  let { class: className = '', children }: { class?: string; children: Snippet } = $props()
</script>

<section class={cn('rounded-xl border bg-card px-4 pb-10 pt-6 shadow-sheet sm:px-10 sm:pt-8', className)}>
  {@render children()}
</section>
