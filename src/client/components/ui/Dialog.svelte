<script lang="ts">
  /** Modal dialog (shadcn Dialog). Escape / backdrop close; focuses the first field. */
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import Icon from './Icon.svelte'

  let {
    open = $bindable(false),
    title,
    description,
    size = 'md',
    onclose,
    children,
    footer,
  }: {
    open?: boolean
    title: string
    description?: string
    size?: 'sm' | 'md' | 'lg' | 'xl'
    onclose?: () => void
    children: Snippet
    footer?: Snippet
  } = $props()

  let panel = $state<HTMLDivElement | null>(null)

  function close() {
    open = false
    onclose?.()
  }

  $effect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    const first = panel?.querySelector<HTMLElement>('input:not([type=hidden]),textarea,select,button[data-autofocus]')
    first?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation()
        close()
      }
    }
    document.addEventListener('keydown', onKey)
    const overflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = overflow
      prev?.focus?.()
    }
  })
</script>

{#if open}
  <div class="fixed inset-0 z-[80] flex items-start justify-center overflow-y-auto p-4 pt-[10vh] sm:p-6 sm:pt-[12vh]">
    <button
      type="button"
      class="fixed inset-0 cursor-default bg-black/50 animate-[fade-in_120ms_ease]"
      aria-label="Close dialog"
      tabindex="-1"
      onclick={close}
    ></button>
    <div
      bind:this={panel}
      role="dialog"
      aria-modal="true"
      aria-label={title}
      class={cn(
        'relative z-10 grid w-full gap-4 rounded-lg border bg-card p-6 shadow-xl animate-[slide-up_150ms_ease]',
        { sm: 'max-w-sm', md: 'max-w-lg', lg: 'max-w-2xl', xl: 'max-w-4xl' }[size],
      )}
    >
      <div class="flex flex-col gap-1.5 pr-8">
        <h2 class="text-lg font-bold leading-tight">{title}</h2>
        {#if description}<p class="text-sm text-muted-foreground">{description}</p>{/if}
      </div>
      {@render children()}
      {#if footer}
        <div class="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">{@render footer()}</div>
      {/if}
      <button
        type="button"
        class="absolute right-4 top-4 rounded-sm p-1 text-muted-foreground opacity-80 transition-opacity hover:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Close"
        onclick={close}
      >
        <Icon icon={icons.X} />
      </button>
    </div>
  </div>
{/if}
