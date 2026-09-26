<script lang="ts">
  /** Native <select> styled like shadcn's Select trigger. */
  import { cn } from '../../lib/cn'

  let {
    value = $bindable(''),
    options,
    class: className = '',
    ...rest
  }: {
    value?: string | number | null
    options: { value: string | number; label: string }[]
    class?: string
    [key: string]: unknown
  } = $props()
</script>

<select
  bind:value
  class={cn(
    'h-9 w-full appearance-none rounded-md border border-input bg-card bg-[length:16px] bg-[right_0.5rem_center] bg-no-repeat pl-3 pr-8 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
    "bg-[url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%23888' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")]",
    className,
  )}
  {...rest}
>
  {#each options as o (o.value)}
    <option value={o.value}>{o.label}</option>
  {/each}
</select>
