<script lang="ts">
  import { cn } from '../../lib/cn'
  import { textareaClass } from '../../lib/variants'

  let {
    value = $bindable(''),
    ref = $bindable(null),
    class: className = '',
    ...rest
  }: { value?: string; ref?: HTMLTextAreaElement | null; class?: string; [key: string]: unknown } = $props()
</script>

<textarea bind:this={ref} bind:value class={cn(textareaClass, className)} {...rest}></textarea>
