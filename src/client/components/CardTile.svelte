<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import type { Card } from '../../shared/models'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { dueLabel, formatDate } from '../lib/time'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'

  let { card, projectId, ondragstart, dragging = false }: { card: Card; projectId: number; ondragstart?: () => void; dragging?: boolean } = $props()
  const due = $derived(dueLabel(card.dueOn))
</script>

<div
  role="listitem"
  draggable="true"
  ondragstart={(e) => {
    e.dataTransfer?.setData('text/plain', String(card.id))
    ondragstart?.()
  }}
  data-card-id={card.id}
  class={cn('group relative cursor-grab rounded-md border bg-card p-2.5 shadow-sm transition-shadow hover:shadow-md active:cursor-grabbing', dragging && 'opacity-40')}
>
  <div class="flex items-start gap-2">
    <Link href={`/projects/${projectId}/cards/${card.id}`} class="min-w-0 flex-1 text-[13px] font-medium leading-snug text-foreground after:absolute after:inset-0 hover:underline">{card.title}</Link>
    {#if card.assignees.length}<span class="flex -space-x-1">{#each card.assignees.slice(0, 2) as p (p.id)}<Avatar person={p} size={20} />{/each}</span>{/if}
  </div>
  <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-muted-foreground">
    <span>By {card.createdBy?.name.split(' ')[0] ?? '—'} on {formatDate(card.createdAt)}</span>
    {#if due}<span class={cn('inline-flex items-center gap-0.5', due.tone === 'overdue' && 'font-semibold text-destructive')}><Icon icon={icons.Calendar} size={11} />{formatDate(card.dueOn ?? '', { weekday: 'short', month: 'short', day: 'numeric' })}</span>{/if}
    {#if card.stepsTotal}<span class={cn('inline-flex items-center gap-0.5', card.stepsDone === card.stepsTotal && 'text-primary')}><Icon icon={icons.CircleCheck} size={11} />{card.stepsDone}/{card.stepsTotal}</span>{/if}
    {#if card.commentCount}<span class="rounded-full bg-sky-600 px-1.5 font-bold text-white">{card.commentCount}</span>{/if}
  </p>
</div>
