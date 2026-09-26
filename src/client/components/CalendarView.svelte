<script lang="ts">
  /**
   * Calendar body: "Next N weeks" agenda or a month grid. Entries carry ISO
   * timestamps (or dates for all-day/to-dos) and are grouped by the viewer's
   * local day. Navigation changes the `from` query param.
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { CalendarEntry } from '../../shared/models'
  import { cn } from '../lib/cn'
  import { colorOf } from '../lib/colors'
  import * as icons from '../lib/icons'
  import { addDaysYmd, dayKey, formatTime, localDate, todayYmd, ymd } from '../lib/time'
  import AvatarStack from './ui/AvatarStack.svelte'
  import Button from './ui/Button.svelte'
  import Icon from './ui/Icon.svelte'
  import Tabs from './ui/Tabs.svelte'

  let {
    entries,
    from,
    weeks = 6,
    showProject = true,
    newEventHref,
    query = {},
  }: {
    entries: CalendarEntry[]
    from: string
    weeks?: number
    showProject?: boolean
    newEventHref?: string
    query?: Record<string, string | number | null>
  } = $props()

  let mode = $state('agenda')
  const today = todayYmd()

  function days(e: CalendarEntry): string[] {
    const start = dayKey(e.startsAt)
    const end = e.allDay ? e.endsAt.slice(0, 10) : dayKey(e.endsAt)
    const out = [start]
    let d = start
    for (let i = 0; i < 60 && d < end; i++) {
      d = addDaysYmd(d, 1)
      out.push(d)
    }
    return out
  }

  const byDay = $derived.by(() => {
    const m = new Map<string, CalendarEntry[]>()
    for (const e of entries) for (const d of days(e)) m.set(d, [...(m.get(d) ?? []), e])
    for (const list of m.values()) list.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.startsAt.localeCompare(b.startsAt))
    return m
  })

  const agendaDays = $derived(Array.from({ length: weeks * 7 }, (_, i) => addDaysYmd(from, i)).filter((d) => byDay.has(d)))

  const monthStart = $derived.by(() => {
    const d = localDate(from)
    d.setDate(1)
    return ymd(d)
  })
  const grid = $derived.by(() => {
    const first = localDate(monthStart)
    const start = addDaysYmd(monthStart, -first.getDay())
    return Array.from({ length: 42 }, (_, i) => addDaysYmd(start, i))
  })
  const monthLabel = $derived(localDate(monthStart).toLocaleDateString(undefined, { month: 'long', year: 'numeric' }))

  function go(nextFrom: string, w = weeks) {
    const params = new URLSearchParams()
    for (const [k, v] of Object.entries(query)) if (v !== null && v !== '' && v !== undefined) params.set(k, String(v))
    params.set('from', nextFrom)
    params.set('weeks', String(w))
    router.get(`${window.location.pathname}?${params}`, {}, { preserveScroll: true, preserveState: true })
  }

  function shift(dir: 1 | -1) {
    if (mode === 'month') {
      const d = localDate(monthStart)
      d.setMonth(d.getMonth() + dir)
      go(ymd(d), 6)
    } else go(addDaysYmd(from, dir * weeks * 7))
  }

  function switchMode(v: string) {
    if (v === 'month') {
      const d = localDate(from)
      d.setDate(1)
      go(ymd(d), 6)
    }
  }

  const label = (d: string) => localDate(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })
</script>

{#snippet chip(e: CalendarEntry, dense: boolean)}
  <Link
    href={e.url}
    class={cn(
      'group flex min-w-0 items-center gap-1.5 rounded text-foreground no-underline',
      dense ? cn('px-1 py-0.5 text-[11px]', colorOf(e.color).soft) : 'py-1.5 text-sm',
    )}
    title={e.title}
  >
    {#if e.kind === 'event'}
      <span class={cn('h-2 w-2 shrink-0 rounded-full', colorOf(e.color).dot)}></span>
    {:else}
      <Icon icon={e.completed ? icons.CircleCheck : e.kind === 'card' ? icons.SquareKanban : icons.Circle} size={dense ? 11 : 14} class={cn('shrink-0', e.completed ? 'text-primary' : 'text-muted-foreground')} />
    {/if}
    {#if !e.allDay}<span class={cn('shrink-0 tabular-nums text-muted-foreground', !dense && 'w-16')}>{formatTime(e.startsAt)}</span>{:else if !dense}<span class="w-16 shrink-0 text-muted-foreground">{e.kind === 'event' ? 'All day' : 'Due'}</span>{/if}
    <span class={cn('truncate group-hover:underline', !dense && 'font-medium', e.completed && 'line-through')}>{e.title}</span>
    {#if !dense && showProject}<span class="hidden truncate text-muted-foreground sm:inline">— {e.projectName}</span>{/if}
    {#if !dense && e.people.length}<span class="ml-auto hidden shrink-0 sm:inline-flex"><AvatarStack people={e.people} size={18} max={4} /></span>{/if}
  </Link>
{/snippet}

<div class="mb-4 flex flex-wrap items-center gap-2">
  <Tabs items={[{ value: 'agenda', label: `Next ${weeks} weeks` }, { value: 'month', label: 'Month' }]} bind:value={mode} onchange={switchMode} label="Calendar view" />
  <div class="flex items-center gap-1">
    <Button variant="outline" size="icon-sm" onclick={() => shift(-1)} aria-label="Earlier"><Icon icon={icons.ChevronLeft} /></Button>
    <Button variant="outline" size="sm" onclick={() => go(todayYmd(), 6)}>Today</Button>
    <Button variant="outline" size="icon-sm" onclick={() => shift(1)} aria-label="Later"><Icon icon={icons.ChevronRight} /></Button>
  </div>
  {#if mode === 'month'}<span class="text-sm font-bold">{monthLabel}</span>{/if}
  {#if newEventHref}<Button size="sm" href={newEventHref} class="ml-auto"><Icon icon={icons.Plus} /> New event</Button>{/if}
</div>

{#if mode === 'agenda'}
  {#if agendaDays.length}
    <ol class="divide-y border-y">
      {#each agendaDays as d (d)}
        <li class="grid gap-1 py-3 sm:grid-cols-[180px_1fr]">
          <p class={cn('text-sm font-bold', d === today && 'text-ginger')}>
            {d === today ? 'Today' : d === addDaysYmd(today, 1) ? 'Tomorrow' : label(d)}
            {#if d === today}<span class="block text-xs font-normal text-muted-foreground">{label(d)}</span>{/if}
          </p>
          <div class="min-w-0">
            {#each byDay.get(d) ?? [] as e (e.kind + e.id)}{@render chip(e, false)}{/each}
          </div>
        </li>
      {/each}
    </ol>
  {:else}
    <p class="rounded-lg border border-dashed py-10 text-center text-sm text-muted-foreground">Nothing scheduled in the next {weeks} weeks.</p>
  {/if}
{:else}
  <div class="grid grid-cols-7 overflow-hidden rounded-lg border text-sm">
    {#each ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as w (w)}
      <div class="border-b bg-muted/50 px-2 py-1.5 text-xs font-semibold text-muted-foreground">{w}</div>
    {/each}
    {#each grid as d (d)}
      {@const inMonth = d.slice(0, 7) === monthStart.slice(0, 7)}
      {@const list = byDay.get(d) ?? []}
      <div class={cn('min-h-[92px] border-b border-r p-1 [&:nth-child(7n)]:border-r-0', !inMonth && 'bg-muted/30 text-muted-foreground')}>
        <p class={cn('mb-1 flex h-6 w-6 items-center justify-center rounded-full text-xs', d === today && 'bg-ginger font-bold text-white')}>{localDate(d).getDate()}</p>
        <div class="grid gap-0.5">
          {#each list.slice(0, 3) as e (e.kind + e.id)}{@render chip(e, true)}{/each}
          {#if list.length > 3}<p class="px-1 text-[11px] text-muted-foreground">+{list.length - 3} more</p>{/if}
        </div>
      </div>
    {/each}
  </div>
{/if}
