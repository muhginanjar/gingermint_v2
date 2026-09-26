<script lang="ts">
  /**
   * My Bar: personal tools pinned to the bottom of every page — My Tasks,
   * My Events, Due Today, My Bookmarks, My Notes — plus the New for You pill.
   * Each opens in place without leaving the current page (Shift+1…5).
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { Bookmark, CalendarEntry } from '../../../shared/models'
  import type { User } from '../../../shared/types'
  import { api } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'
  import { type MyPanel, toast, ui } from '../../lib/state.svelte'
  import { dayKey, dueLabel, formatDay, formatTime, relativeTime } from '../../lib/time'
  import Avatar from '../ui/Avatar.svelte'
  import Icon from '../ui/Icon.svelte'
  import Keycap from './Keycap.svelte'

  let { user }: { user: User } = $props()

  type Assignment = { kind: 'todo' | 'card'; id: number; title: string; dueOn: string | null; projectName: string; url: string }

  let tasks = $state<Assignment[] | null>(null)
  let events = $state<CalendarEntry[] | null>(null)
  let today = $state<{ items: Assignment[]; events: CalendarEntry[] } | null>(null)
  let bookmarks = $state<Bookmark[] | null>(null)
  let note = $state('')
  let noteSaved = $state<string | null>(null)
  let noteTimer: ReturnType<typeof setTimeout> | undefined
  let bar = $state<HTMLDivElement | null>(null)

  const ITEMS: { key: Exclude<MyPanel, null>; label: string; icon: typeof icons.Bell; cap: string }[] = [
    { key: 'tasks', label: 'My Tasks', icon: icons.CircleCheck, cap: '1' },
    { key: 'events', label: 'My Events', icon: icons.CalendarDays, cap: '2' },
    { key: 'today', label: 'Due Today', icon: icons.AlarmClock, cap: '3' },
    { key: 'bookmarks', label: 'My Bookmarks', icon: icons.Bookmark, cap: '4' },
    { key: 'notes', label: 'My Notes', icon: icons.StickyNote, cap: '5' },
  ]

  $effect(() => {
    const panel = ui.myPanel
    if (!panel) return
    if (panel === 'tasks') api.get<{ items: Assignment[] }>('/my/tasks').then((d) => (tasks = d.items)).catch(() => {})
    if (panel === 'events') api.get<{ entries: CalendarEntry[] }>('/my/events').then((d) => (events = d.entries)).catch(() => {})
    if (panel === 'today') api.get<{ items: Assignment[]; events: CalendarEntry[] }>('/my/today').then((d) => (today = d)).catch(() => {})
    if (panel === 'bookmarks') api.get<{ bookmarks: Bookmark[] }>('/my/bookmarks').then((d) => (bookmarks = d.bookmarks)).catch(() => {})
    if (panel === 'notes')
      api.get<{ body: string; updatedAt: string | null }>('/my/notes').then((d) => {
        note = d.body
        noteSaved = d.updatedAt
      })
    const onDown = (e: MouseEvent) => {
      if (bar && !bar.contains(e.target as Node)) ui.myPanel = null
    }
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && (ui.myPanel = null)
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  })

  function toggle(key: Exclude<MyPanel, null>) {
    ui.myPanel = ui.myPanel === key ? null : key
  }

  function go(url: string) {
    ui.myPanel = null
    router.visit(url)
  }

  function onNoteInput() {
    clearTimeout(noteTimer)
    noteTimer = setTimeout(async () => {
      const res = await api.put<{ updatedAt: string }>('/my/notes', { body: note })
      noteSaved = res.updatedAt
    }, 700)
  }

  async function removeBookmark(b: Bookmark) {
    await api.delete(`/my/bookmarks/${b.id}`)
    bookmarks = (bookmarks ?? []).filter((x) => x.id !== b.id)
    toast('Bookmark removed.')
  }

  function groupByDay(list: CalendarEntry[]) {
    const out = new Map<string, CalendarEntry[]>()
    for (const e of list) out.set(dayKey(e.startsAt), [...(out.get(dayKey(e.startsAt)) ?? []), e])
    return [...out.entries()]
  }
</script>

{#snippet assignment(a: Assignment)}
  {@const due = dueLabel(a.dueOn)}
  <button type="button" onclick={() => go(a.url)} class="flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted">
    <Icon icon={a.kind === 'todo' ? icons.Circle : icons.SquareKanban} class="mt-0.5 text-muted-foreground" />
    <span class="min-w-0 flex-1">
      <span class="block truncate text-sm">{a.title}</span>
      <span class="block truncate text-xs text-muted-foreground">
        {a.projectName}{#if due} · <span class={cn(due.tone === 'overdue' && 'font-semibold text-destructive', due.tone === 'today' && 'font-semibold text-ginger')}>{due.text}</span>{/if}
      </span>
    </span>
  </button>
{/snippet}

{#snippet entry(e: CalendarEntry)}
  <button type="button" onclick={() => go(e.url)} class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-muted">
    <span class={cn('h-2 w-2 shrink-0 rounded-full', colorOf(e.color).dot)}></span>
    <span class="w-14 shrink-0 text-xs text-muted-foreground">{e.allDay ? 'All day' : formatTime(e.startsAt)}</span>
    <span class="min-w-0 flex-1 truncate text-sm">{e.title}</span>
  </button>
{/snippet}

<div bind:this={bar} class="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center pb-3 max-md:justify-start max-md:pl-3">
  <div class="pointer-events-auto relative flex items-center gap-0.5 rounded-full border bg-card/95 px-1.5 py-1 shadow-lg backdrop-blur">
    <Link href="/profile" class="mr-1 rounded-full" aria-label="Your profile"><Avatar person={user} size={26} /></Link>
    {#each ITEMS as item (item.key)}
      <button
        type="button"
        onclick={() => toggle(item.key)}
        aria-expanded={ui.myPanel === item.key}
        class={cn(
          'relative flex h-8 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors',
          ui.myPanel === item.key ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
        )}
      >
        <Icon icon={item.icon} size={14} />
        <span class="hidden lg:inline">{item.label}</span>
        <Keycap k={`⇧${item.cap}`} />
      </button>
    {/each}

    {#if ui.myPanel}
      <div
        class="absolute bottom-full left-1/2 mb-2 max-h-[60vh] w-[min(380px,calc(100vw-24px))] -translate-x-1/2 overflow-y-auto max-md:left-0 max-md:translate-x-0 rounded-xl border bg-popover p-2 text-popover-foreground shadow-2xl animate-[slide-up_140ms_ease]"
        role="dialog"
        aria-label={ITEMS.find((i) => i.key === ui.myPanel)?.label}
      >
        <p class="px-2 pb-1 pt-1 text-sm font-bold">{ITEMS.find((i) => i.key === ui.myPanel)?.label}</p>
        {#if ui.myPanel === 'tasks'}
          {#each tasks ?? [] as a (a.kind + a.id)}{@render assignment(a)}{:else}
            <p class="px-2 py-4 text-sm text-muted-foreground">{tasks ? 'Nothing assigned to you. Nice.' : 'Loading…'}</p>
          {/each}
        {:else if ui.myPanel === 'events'}
          {#each groupByDay(events ?? []) as [day, list] (day)}
            <p class="px-2 pt-2 text-xs font-semibold text-muted-foreground">{formatDay(day)}</p>
            {#each list as e (e.kind + e.id)}{@render entry(e)}{/each}
          {:else}
            <p class="px-2 py-4 text-sm text-muted-foreground">{events ? 'No events in the next three weeks.' : 'Loading…'}</p>
          {/each}
        {:else if ui.myPanel === 'today'}
          {#if today}
            {#each today.events as e (e.kind + e.id)}{@render entry(e)}{/each}
            {#each today.items as a (a.kind + a.id)}{@render assignment(a)}{/each}
            {#if !today.events.length && !today.items.length}
              <p class="px-2 py-4 text-sm text-muted-foreground">Nothing due today.</p>
            {/if}
          {:else}
            <p class="px-2 py-4 text-sm text-muted-foreground">Loading…</p>
          {/if}
        {:else if ui.myPanel === 'bookmarks'}
          {#each bookmarks ?? [] as b (b.id)}
            <div class="group flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-muted">
              <Icon icon={icons.Bookmark} class="text-muted-foreground" />
              <button type="button" onclick={() => go(b.url)} class="min-w-0 flex-1 text-left">
                <span class="block truncate text-sm">{b.title}</span>
                <span class="block truncate text-xs text-muted-foreground">{b.context || b.kind} · {relativeTime(b.createdAt)}</span>
              </button>
              <button type="button" class="invisible rounded p-1 text-muted-foreground hover:text-foreground group-hover:visible" aria-label="Remove bookmark" onclick={() => removeBookmark(b)}>
                <Icon icon={icons.X} size={14} />
              </button>
            </div>
          {:else}
            <p class="px-2 py-4 text-sm text-muted-foreground">{bookmarks ? 'Bookmark anything with the Bookmark button at the top of a page.' : 'Loading…'}</p>
          {/each}
        {:else if ui.myPanel === 'notes'}
          <textarea
            bind:value={note}
            oninput={onNoteInput}
            rows="10"
            placeholder="Private notes, just for you. Saved as you type."
            aria-label="My notes"
            class="w-full resize-y rounded-md border border-input bg-card p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          ></textarea>
          <p class="px-1 text-xs text-muted-foreground">{noteSaved ? `Saved ${relativeTime(noteSaved)}` : 'Only you can see this.'}</p>
        {/if}
      </div>
    {/if}
  </div>
</div>

<button
  type="button"
  onclick={() => (ui.nfyOpen = true)}
  class={cn(
    'fixed bottom-3 right-3 z-40 hidden h-10 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-lg transition-colors md:flex',
    ui.unread > 0 ? 'border-transparent bg-ginger-soft text-foreground hover:bg-ginger-soft/80' : 'bg-card text-muted-foreground hover:text-foreground',
  )}
  aria-label={`New for you${ui.unread ? ` (${ui.unread} unread)` : ''}`}
>
  <span class={cn('h-2.5 w-2.5 rounded-full', ui.unread > 0 ? 'bg-ginger' : 'bg-muted-foreground/40')}></span>
  New for you
  {#if ui.unread > 0}<span class="rounded-full bg-ginger px-1.5 text-xs text-white">{ui.unread}</span>{/if}
  {#if ui.pingUnread > 0}<span class="flex items-center gap-0.5 text-xs text-ginger"><Icon icon={icons.MessageCircle} size={12} />{ui.pingUnread}</span>{/if}
  <Keycap k="⇧N" />
</button>
