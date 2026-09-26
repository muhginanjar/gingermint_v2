<script lang="ts">
  import { cn } from '../../lib/cn'
  let { vertical = false, class: className = '' }: { vertical?: boolean; class?: string } = $props()
</script>

<div role="separator" class={cn('shrink-0 bg-border', vertical ? 'h-full w-px' : 'h-px w-full', className)}></div>
