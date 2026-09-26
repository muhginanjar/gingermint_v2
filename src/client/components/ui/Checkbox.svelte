<script lang="ts">
  /** Round Basecamp-style check (to-dos) or shadcn square check (`square`). */
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import Icon from './Icon.svelte'

  let {
    checked = $bindable(false),
    square = false,
    label,
    onchange,
    disabled = false,
    class: className = '',
  }: { checked?: boolean; square?: boolean; label?: string; onchange?: (v: boolean) => void; disabled?: boolean; class?: string } =
    $props()

  function toggle() {
    if (disabled) return
    checked = !checked
    onchange?.(checked)
  }
</script>

<button
  type="button"
  role="checkbox"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={toggle}
  class={cn(
    'inline-flex shrink-0 items-center justify-center border-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    square ? 'h-4 w-4 rounded-sm' : 'h-[18px] w-[18px] rounded-full',
    checked ? 'border-primary bg-primary text-primary-foreground' : 'border-muted-foreground/50 bg-card hover:border-primary',
    className,
  )}
>
  {#if checked}<Icon icon={icons.Check} size={square ? 12 : 12} strokeWidth={3} />{/if}
</button>
