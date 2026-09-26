<script lang="ts">
  /** Project icon: pick an emoji (content identity, not UI chrome) or none. */
  import { cn } from '../lib/cn'

  const CHOICES = ['', '🚀', '🎨', '📣', '🛠️', '📦', '💼', '🧪', '🧢', '🌱', '📈', '🧾', '🎯', '💡', '🏗️', '🤝', '📚', '🎬', '🧭', '⚙️', '🔒', '🌍', '🛒', '🍃', '☕', '🎧', '🏆', '📅', '✈️', '🐞']

  let { value = $bindable('') }: { value?: string } = $props()
</script>

<div role="radiogroup" aria-label="Project icon" class="flex flex-wrap gap-1">
  {#each CHOICES as e (e)}
    <button
      type="button"
      role="radio"
      aria-checked={value === e}
      aria-label={e || 'No icon'}
      onclick={() => (value = e)}
      class={cn('flex h-8 w-8 items-center justify-center rounded-md border text-base transition-colors', value === e ? 'border-primary bg-accent' : 'border-transparent hover:bg-muted')}
    >
      {#if e}{e}{:else}<span class="text-xs text-muted-foreground">Aa</span>{/if}
    </button>
  {/each}
</div>
