<script lang="ts">
  import { cn } from '../../lib/cn'
  import { inputClass } from '../../lib/variants'

  let {
    value = $bindable(''),
    ref = $bindable(null),
    class: className = '',
    ...rest
  }: { value?: string | number | null; ref?: HTMLInputElement | null; class?: string; [key: string]: unknown } = $props()
</script>

<input bind:this={ref} bind:value class={cn(inputClass, className)} {...rest} />
