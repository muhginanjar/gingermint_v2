<script lang="ts">
  import { cn } from '../../lib/cn'

  let {
    checked = $bindable(false),
    label,
    onchange,
    disabled = false,
    class: className = '',
  }: { checked?: boolean; label?: string; onchange?: (v: boolean) => void; disabled?: boolean; class?: string } = $props()

  function toggle() {
    if (disabled) return
    checked = !checked
    onchange?.(checked)
  }
</script>

<button
  type="button"
  role="switch"
  aria-checked={checked}
  aria-label={label}
  {disabled}
  onclick={toggle}
  class={cn(
    'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50',
    checked ? 'bg-primary' : 'bg-input',
    className,
  )}
>
  <span
    class={cn(
      'pointer-events-none block h-4 w-4 rounded-full bg-background shadow-lg ring-0 transition-transform',
      checked ? 'translate-x-4' : 'translate-x-0',
    )}
  ></span>
</button>
