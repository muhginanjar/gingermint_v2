<script lang="ts">
  import type { Person } from '../../../shared/models'
  import Avatar from './Avatar.svelte'

  let { people, size = 24, max = 8 }: { people: Person[]; size?: number; max?: number } = $props()
  const shown = $derived(people.slice(0, max))
</script>

<span class="inline-flex items-center -space-x-1.5" aria-label={people.map((p) => p.name).join(', ')}>
  {#each shown as p (p.id)}
    <Avatar person={p} {size} />
  {/each}
  {#if people.length > max}
    <span
      class="inline-flex items-center justify-center rounded-full bg-muted text-[10px] font-semibold text-muted-foreground ring-2 ring-card"
      style={`width:${size}px;height:${size}px`}>+{people.length - max}</span
    >
  {/if}
</span>
