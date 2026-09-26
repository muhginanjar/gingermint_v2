<script lang="ts">
  import type { Person } from '../../../shared/models'
  import { cn } from '../../lib/cn'
  import { avatarBg, initials } from '../../lib/colors'

  let {
    person,
    size = 28,
    class: className = '',
    title,
  }: { person: Pick<Person, 'id' | 'name' | 'avatarUrl'> | null; size?: number; class?: string; title?: string } = $props()
</script>

{#if person?.avatarUrl}
  <img
    src={person.avatarUrl}
    alt=""
    title={title ?? person.name}
    width={size}
    height={size}
    class={cn('inline-block shrink-0 rounded-full object-cover ring-2 ring-card', className)}
    style={`width:${size}px;height:${size}px`}
  />
{:else}
  <span
    title={title ?? person?.name ?? 'Unknown'}
    class={cn(
      'inline-flex shrink-0 select-none items-center justify-center rounded-full font-semibold text-white ring-2 ring-card',
      person ? avatarBg(person.id) : 'bg-stone-400',
      className,
    )}
    style={`width:${size}px;height:${size}px;font-size:${Math.max(9, Math.round(size * 0.4))}px`}
    aria-hidden="true">{person ? initials(person.name) : '?'}</span
  >
{/if}
