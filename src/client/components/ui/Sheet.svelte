<script lang="ts">
  /** Right-side sheet (shadcn Sheet). Used for New for You. */
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/cn'

  let {
    open = $bindable(false),
    label,
    class: className = '',
    children,
  }: { open?: boolean; label: string; class?: string; children: Snippet } = $props()

  $effect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') open = false
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  })
</script>

{#if open}
  <div class="fixed inset-0 z-[70]">
    <button
      type="button"
      class="absolute inset-0 cursor-default bg-black/20 animate-[fade-in_120ms_ease] lg:bg-transparent"
      aria-label="Close panel"
      tabindex="-1"
      onclick={() => (open = false)}
    ></button>
    <aside
      aria-label={label}
      class={cn(
        'absolute inset-y-0 right-0 flex w-full max-w-[400px] flex-col border-l bg-card shadow-2xl animate-[slide-in-right_180ms_ease]',
        className,
      )}
    >
      {@render children()}
    </aside>
  </div>
{/if}
