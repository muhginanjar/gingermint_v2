<script lang="ts">
  /** A toolbox card's live preview — a small, glanceable snapshot of each tool. */
  import type { CalendarEntry, ChatLine, CheckinQuestion, Message, Todo, TodoList, ToolKind, VaultItem } from '../../shared/models'
  import { cn } from '../lib/cn'
  import { colorOf } from '../lib/colors'
  import * as icons from '../lib/icons'
  import { dayKey, formatDay, formatTime, minutesLabel, relativeTime } from '../lib/time'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'

  let { kind, data }: { kind: ToolKind; data: unknown } = $props()

  const messages = $derived((data as Message[] | undefined) ?? [])
  const todos = $derived((data as { lists: TodoList[]; loose: Todo[] } | undefined) ?? { lists: [], loose: [] })
  const docs = $derived((data as VaultItem[] | undefined) ?? [])
  const schedule = $derived((data as CalendarEntry[] | undefined) ?? [])
  const chat = $derived((data as ChatLine[] | undefined) ?? [])
  const columns = $derived((data as { id: number; name: string; color: string; kind: string; count: number }[] | undefined) ?? [])
  const checkins = $derived((data as CheckinQuestion[] | undefined) ?? [])
  const sheet = $derived((data as { minutes: number; count: number } | undefined) ?? { minutes: 0, count: 0 })
</script>

<div class="text-[13px]">
  {#if kind === 'message_board'}
    {#each messages as m (m.id)}
      <div class="flex gap-2 py-1.5">
        <Avatar person={m.author} size={22} />
        <div class="min-w-0">
          <p class="truncate font-semibold">{m.title}</p>
          <p class="truncate text-muted-foreground">{m.author?.name} · {relativeTime(m.createdAt)}</p>
        </div>
      </div>
    {:else}
      <p class="py-4 text-center text-muted-foreground">Post announcements, pitch ideas, and gather feedback.</p>
    {/each}
  {:else if kind === 'todos'}
    {#each todos.lists as l (l.id)}
      <div class="py-1">
        <p class="flex items-center justify-between gap-2"><span class="truncate font-semibold">{l.name}</span><span class="shrink-0 text-xs text-muted-foreground">{l.completed}/{l.total}</span></p>
        <div class="mt-1 h-1.5 overflow-hidden rounded-full bg-muted"><div class="h-full rounded-full bg-primary" style={`width:${l.total ? (l.completed / l.total) * 100 : 0}%`}></div></div>
      </div>
    {/each}
    {#each todos.loose as t (t.id)}
      <p class="flex items-center gap-1.5 py-0.5"><Icon icon={icons.Circle} size={12} class="text-muted-foreground" /><span class="truncate">{t.title}</span></p>
    {/each}
    {#if !todos.lists.length && !todos.loose.length}<p class="py-4 text-center text-muted-foreground">Make lists of work, assign tasks, set due dates.</p>{/if}
  {:else if kind === 'docs'}
    <div class="grid grid-cols-3 gap-2">
      {#each docs as d (d.id)}
        <div class="flex flex-col items-center gap-1 text-center">
          <span class={cn('flex h-10 w-10 items-center justify-center rounded-md', d.kind === 'folder' ? cn(colorOf(d.color).strong, 'text-white') : 'bg-muted text-muted-foreground')}>
            <Icon icon={d.kind === 'folder' ? icons.Folder : d.kind === 'doc' ? icons.FileText : d.kind === 'link' ? icons.Link : d.attachment?.kind === 'image' ? icons.Image : icons.File} size={18} />
          </span>
          <span class="line-clamp-2 w-full text-[11px] leading-tight">{d.title}</span>
        </div>
      {/each}
    </div>
    {#if !docs.length}<p class="py-4 text-center text-muted-foreground">Share docs, files, images and links.</p>{/if}
  {:else if kind === 'schedule'}
    {#each schedule as e (e.kind + e.id)}
      <div class="flex gap-2 py-1">
        <span class="w-16 shrink-0 text-xs font-semibold text-muted-foreground">{formatDay(dayKey(e.startsAt))}</span>
        <span class="min-w-0 truncate">{e.allDay ? '' : `${formatTime(e.startsAt)} `}{e.title}</span>
      </div>
    {:else}
      <p class="py-4 text-center text-muted-foreground">Nothing's coming up in the next 30 days.</p>
    {/each}
  {:else if kind === 'chat'}
    {#each chat as l (l.id)}
      <div class="flex gap-2 py-1">
        <Avatar person={l.author} size={20} />
        <p class="min-w-0 truncate"><span class="font-semibold">{l.author?.name.split(' ')[0]}</span> {l.body || '📎'}</p>
      </div>
    {:else}
      <p class="py-4 text-center text-muted-foreground">Chat casually with the group, ask quick questions.</p>
    {/each}
  {:else if kind === 'card_table'}
    <div class="flex h-24 items-end gap-1.5">
      {#each columns as c (c.id)}
        <div class="flex min-w-0 flex-1 flex-col items-center gap-1" title={`${c.name}: ${c.count}`}>
          <div class={cn('w-full rounded-t', colorOf(c.color).strong)} style={`height:${Math.max(6, Math.min(72, c.count * 12))}px`}></div>
          <span class="w-full truncate text-center text-[10px] text-muted-foreground">{c.name}</span>
        </div>
      {/each}
    </div>
  {:else if kind === 'checkins'}
    {#each checkins as q (q.id)}
      <p class="truncate py-1">“{q.question}”</p>
    {:else}
      <p class="py-4 text-center text-muted-foreground">Ask the team a question on a schedule.</p>
    {/each}
  {:else if kind === 'timesheet'}
    <p class="py-3 text-center"><span class="block text-2xl font-black">{minutesLabel(sheet.minutes)}</span><span class="text-muted-foreground">logged in the last 30 days · {sheet.count} entries</span></p>
  {/if}
</div>
