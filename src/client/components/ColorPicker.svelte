<script lang="ts">
  import { COLORS, type Color } from '../../shared/models'
  import { cn } from '../lib/cn'
  import { PALETTE } from '../lib/colors'

  let { value = $bindable('blue'), label = 'Color' }: { value?: Color | string; label?: string } = $props()
</script>

<div role="radiogroup" aria-label={label} class="flex flex-wrap gap-1.5">
  {#each COLORS as c (c)}
    <button
      type="button"
      role="radio"
      aria-checked={value === c}
      aria-label={PALETTE[c].label}
      title={PALETTE[c].label}
      onclick={() => (value = c)}
      class={cn('h-7 w-7 rounded-full ring-offset-2 ring-offset-card transition-shadow', PALETTE[c].strong, value === c ? 'ring-2 ring-foreground' : 'hover:ring-2 hover:ring-border')}
    ></button>
  {/each}
</div>
