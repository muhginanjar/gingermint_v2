<script lang="ts">
  /** Emoji reactions ("boosts") on any recordable. */
  import type { ReactionGroup } from '../../shared/models'
  import { api } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import Icon from './ui/Icon.svelte'
  import Popover from './ui/Popover.svelte'

  const EMOJI = ['👍', '❤️', '😂', '🎉', '🙌', '👀', '🔥', '✅', '🚀', '🙏']

  let {
    type,
    id,
    reactions = $bindable([]),
    endpoint,
    compact = false,
  }: { type: string; id: number; reactions?: ReactionGroup[]; endpoint?: string; compact?: boolean } = $props()

  let open = $state(false)

  async function toggle(emoji: string) {
    open = false
    try {
      const res = endpoint
        ? await api.post<{ reactions: ReactionGroup[] }>(endpoint, { emoji })
        : await api.post<{ reactions: ReactionGroup[] }>('/reactions', { type, id, emoji })
      reactions = res.reactions
    } catch {
      /* ignore */
    }
  }
</script>

<div class="flex flex-wrap items-center gap-1">
  {#each reactions as r (r.emoji)}
    <button
      type="button"
      onclick={() => toggle(r.emoji)}
      title={r.people.join(', ')}
      aria-pressed={r.mine}
      class={cn(
        'inline-flex h-6 items-center gap-1 rounded-full border px-2 text-xs transition-colors',
        r.mine ? 'border-primary/40 bg-accent' : 'bg-card hover:bg-muted',
      )}
    >
      <span>{r.emoji}</span><span class="font-semibold tabular-nums">{r.count}</span>
    </button>
  {/each}
  <Popover bind:open side="top" contentClass="min-w-0 w-auto p-1.5">
    {#snippet trigger({ toggle: t })}
      <button
        type="button"
        onclick={t}
        class={cn('inline-flex h-6 items-center gap-1 rounded-full px-1.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground', compact && 'opacity-0 group-hover:opacity-100 focus:opacity-100')}
        aria-label="Add a boost"
        title="Boost"
      >
        <Icon icon={icons.ThumbsUp} size={13} />{#if !reactions.length && !compact}<span>Boost</span>{/if}
      </button>
    {/snippet}
    {#snippet children()}
      <div class="grid grid-cols-5 gap-0.5">
        {#each EMOJI as e (e)}
          <button type="button" class="flex h-8 w-8 items-center justify-center rounded text-lg hover:bg-muted" onclick={() => toggle(e)} aria-label={`React with ${e}`}>{e}</button>
        {/each}
      </div>
    {/snippet}
  </Popover>
</div>
