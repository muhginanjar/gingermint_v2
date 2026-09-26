<script lang="ts">
  /**
   * Reports: a high-level overview plus Overdue, Assignments (what's on
   * each person's plate), Upcoming dates, Timesheet, and The Lineup
   * (every project on one timeline).
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { CalendarEntry, Person, ProjectSummary, TimeEntry } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import CalendarView from '../../components/CalendarView.svelte'
  import ProjectMark from '../../components/ProjectMark.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import AvatarStack from '../../components/ui/AvatarStack.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Select from '../../components/ui/Select.svelte'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'
  import { addDaysYmd, dueLabel, formatDate, localDate, minutesLabel, todayYmd, ymd } from '../../lib/time'

  type Workload = { person: Person | null; open: number; overdue: number; dueSoon: number }
  type Overdue = { id: number; kind: string; title: string; dueOn: string; projectId: number; projectName: string; url: string; daysLate: number; assignees: Person[] }
  type Assignment = { kind: 'todo' | 'card'; id: number; title: string; dueOn: string | null; projectName: string; url: string }

  let props: {
    report: string
    overdue?: Overdue[]
    workload?: Workload[]
    person?: Person | null
    assignments?: Assignment[]
    entries?: CalendarEntry[] | TimeEntry[]
    range?: { from: string; to: string }
    people?: Person[]
    personId?: number
    projects?: ProjectSummary[]
    overdueCount?: number
    pulse?: { completedThisWeek: number }
    lineupCount?: number
  } = $props()

  const REPORTS = [
    { value: 'overview', label: 'Overview', icon: icons.ChartPie },
    { value: 'overdue', label: 'Overdue', icon: icons.TriangleAlert },
    { value: 'assignments', label: "What's on everyone's plate", icon: icons.Users },
    { value: 'upcoming', label: 'Upcoming dates', icon: icons.CalendarDays },
    { value: 'timesheet', label: 'Timesheet', icon: icons.Timer },
    { value: 'lineup', label: 'The Lineup', icon: icons.ChartNoAxesGantt },
  ]
  const current = $derived(REPORTS.find((r) => r.value === props.report) ?? REPORTS[0]!)

  // Timesheet filters
  let from = $state(props.range?.from ?? '')
  let to = $state(props.range?.to ?? '')
  let who = $state<string | number>(props.personId || '')
  const timeEntries = $derived((props.report === 'timesheet' ? (props.entries as TimeEntry[]) : []) ?? [])
  const timeTotal = $derived(timeEntries.reduce((s, e) => s + e.minutes, 0))
  const byProject = $derived.by(() => {
    const m = new Map<string, number>()
    for (const e of timeEntries) m.set(e.projectName, (m.get(e.projectName) ?? 0) + e.minutes)
    return [...m.entries()].sort((a, b) => b[1] - a[1])
  })

  // Lineup geometry
  const lineup = $derived(props.projects ?? [])
  const span = $derived.by(() => {
    const dates = lineup.flatMap((p) => [p.startOn, p.endOn]).filter((d): d is string => !!d)
    const today = todayYmd()
    const min = [...dates, addDaysYmd(today, -30)].sort()[0] ?? today
    const max = [...dates, addDaysYmd(today, 60)].sort().at(-1) ?? today
    const start = localDate(min)
    start.setDate(1)
    const end = localDate(max)
    end.setMonth(end.getMonth() + 1, 0)
    return { start: ymd(start), end: ymd(end), days: Math.max(1, Math.round((end.getTime() - start.getTime()) / 86_400_000)) }
  })
  const pct = (d: string) => (Math.round((localDate(d).getTime() - localDate(span.start).getTime()) / 86_400_000) / span.days) * 100
  const months = $derived.by(() => {
    const out: { label: string; left: number }[] = []
    const d = localDate(span.start)
    while (ymd(d) <= span.end) {
      out.push({ label: d.toLocaleDateString(undefined, { month: 'short', year: d.getMonth() === 0 ? '2-digit' : undefined }), left: pct(ymd(d)) })
      d.setMonth(d.getMonth() + 1)
    }
    return out
  })
</script>

<AppShell tint="global" title={`Reports: ${current.label}`} crumbs={[{ label: 'Reports', href: '/reports' }, { label: current.label }]} wide>
  <div class="grid gap-5 lg:grid-cols-[240px_1fr]">
    <nav class="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Reports">
      {#each REPORTS as r (r.value)}
        <Link href={r.value === 'overview' ? '/reports' : `/reports/${r.value}`} class={cn('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline', r.value === props.report ? 'bg-foreground text-background' : 'text-foreground hover:bg-card')}>
          <Icon icon={r.icon} size={15} />{r.label}
        </Link>
      {/each}
    </nav>

    <Sheet>
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reports</p>
      <h1 class="mb-6 text-[32px] font-black tracking-tight">{current.label}</h1>

      {#if props.report === 'overview'}
        <div class="grid gap-4 md:grid-cols-[1.4fr_1fr]">
          <Link href="/reports/overdue" class={cn('rounded-xl border p-6 no-underline transition-shadow hover:shadow-md', (props.overdueCount ?? 0) > 0 ? 'bg-destructive/5' : 'bg-accent/40')}>
            <p class="text-sm font-semibold text-muted-foreground">Overdue right now</p>
            <p class={cn('mt-1 text-6xl font-black tabular-nums', (props.overdueCount ?? 0) > 0 ? 'text-destructive' : 'text-primary')}>{props.overdueCount ?? 0}</p>
            <p class="mt-2 text-sm text-foreground">{(props.overdueCount ?? 0) > 0 ? 'to-dos and cards past their due date →' : 'Nothing is late. Nice.'}</p>
          </Link>
          <div class="grid gap-4">
            <div class="rounded-xl border p-4"><p class="text-sm text-muted-foreground">Completed in the last 7 days</p><p class="text-3xl font-black tabular-nums">{props.pulse?.completedThisWeek ?? 0}</p></div>
            <Link href="/reports/lineup" class="rounded-xl border p-4 no-underline hover:shadow-md"><p class="text-sm text-muted-foreground">Projects on the Lineup</p><p class="text-3xl font-black tabular-nums text-foreground">{props.lineupCount ?? 0}</p></Link>
          </div>
        </div>
        <h2 class="mb-2 mt-8 font-black">Busiest people</h2>
        <ul class="divide-y">
          {#each props.workload ?? [] as w (w.person?.id)}
            <li class="flex items-center gap-3 py-2">
              <Avatar person={w.person} size={28} />
              <Link href={`/reports/assignments?person=${w.person?.id}`} class="flex-1 font-medium hover:underline">{w.person?.name}</Link>
              <span class="text-sm tabular-nums">{w.open} open</span>
              {#if w.overdue}<span class="rounded bg-destructive/10 px-1.5 text-xs font-semibold text-destructive">{w.overdue} overdue</span>{/if}
            </li>
          {:else}
            <li class="py-3 text-sm text-muted-foreground">Nobody has assignments yet.</li>
          {/each}
        </ul>
      {:else if props.report === 'overdue'}
        <ul class="divide-y">
          {#each props.overdue ?? [] as o (o.kind + o.id)}
            <li class="flex items-center gap-3 py-3">
              <Icon icon={o.kind === 'card' ? icons.SquareKanban : icons.Circle} class="text-muted-foreground" />
              <div class="min-w-0 flex-1">
                <Link href={o.url} class="font-semibold hover:underline">{o.title}</Link>
                <p class="text-sm text-muted-foreground">{o.projectName} · due {formatDate(o.dueOn)}</p>
              </div>
              {#if o.assignees.length}<AvatarStack people={o.assignees} size={22} />{/if}
              <span class="shrink-0 rounded bg-destructive/10 px-2 py-0.5 text-xs font-bold text-destructive">{o.daysLate} {o.daysLate === 1 ? 'day' : 'days'} late</span>
            </li>
          {:else}
            <li class="py-10 text-center text-muted-foreground">Nothing is overdue. 🎉</li>
          {/each}
        </ul>
      {:else if props.report === 'assignments'}
        <div class="grid gap-6 md:grid-cols-[260px_1fr]">
          <ul class="grid content-start gap-1">
            {#each props.workload ?? [] as w (w.person?.id)}
              <li>
                <Link href={`/reports/assignments?person=${w.person?.id}`} class={cn('flex items-center gap-2 rounded-md px-2 py-1.5 text-sm no-underline', props.person?.id === w.person?.id ? 'bg-accent' : 'hover:bg-muted')}>
                  <Avatar person={w.person} size={22} /><span class="flex-1 truncate text-foreground">{w.person?.name}</span>
                  <span class="text-xs tabular-nums text-muted-foreground">{w.open}</span>
                  {#if w.overdue}<span class="h-2 w-2 rounded-full bg-destructive" title={`${w.overdue} overdue`}></span>{/if}
                </Link>
              </li>
            {/each}
          </ul>
          <div>
            <h2 class="mb-2 flex items-center gap-2 font-black"><Avatar person={props.person ?? null} size={26} />{props.person?.name ?? 'Someone'}'s plate</h2>
            <ul class="divide-y">
              {#each props.assignments ?? [] as a (a.kind + a.id)}
                {@const due = dueLabel(a.dueOn)}
                <li class="flex items-center gap-2 py-2 text-sm">
                  <Icon icon={a.kind === 'card' ? icons.SquareKanban : icons.Circle} class="text-muted-foreground" />
                  <Link href={a.url} class="min-w-0 flex-1 truncate hover:underline">{a.title}</Link>
                  <span class="truncate text-xs text-muted-foreground">{a.projectName}</span>
                  {#if due}<span class={cn('shrink-0 text-xs', due.tone === 'overdue' && 'font-semibold text-destructive')}>{due.text}</span>{/if}
                </li>
              {:else}
                <li class="py-6 text-sm text-muted-foreground">Nothing assigned.</li>
              {/each}
            </ul>
          </div>
        </div>
      {:else if props.report === 'upcoming'}
        <CalendarView entries={(props.entries as CalendarEntry[]) ?? []} from={todayYmd()} weeks={3} />
      {:else if props.report === 'timesheet'}
        <div class="flex flex-wrap items-end gap-2">
          <label class="grid gap-1 text-sm">From<Input type="date" bind:value={from} class="w-40" /></label>
          <label class="grid gap-1 text-sm">To<Input type="date" bind:value={to} class="w-40" /></label>
          <label class="grid gap-1 text-sm">Person<Select bind:value={who} options={[{ value: '', label: 'Everyone' }, ...(props.people ?? []).map((p) => ({ value: p.id, label: p.name }))]} class="w-44" /></label>
          <Button variant="outline" onclick={() => router.get(`/reports/timesheet?from=${from}&to=${to}${who ? `&person=${who}` : ''}`)}>Run report</Button>
        </div>
        <p class="mt-6 text-4xl font-black tabular-nums">{minutesLabel(timeTotal)}</p>
        <div class="mt-4 grid gap-2">
          {#each byProject as [name, min] (name)}
            <div class="flex items-center gap-3 text-sm">
              <span class="w-48 truncate">{name}</span>
              <div class="h-2 flex-1 overflow-hidden rounded-full bg-muted"><div class="h-full bg-primary" style={`width:${timeTotal ? (min / timeTotal) * 100 : 0}%`}></div></div>
              <span class="w-16 text-right tabular-nums">{minutesLabel(min)}</span>
            </div>
          {/each}
        </div>
        <table class="mt-6 w-full text-sm">
          <tbody class="divide-y">
            {#each timeEntries as e (e.id)}
              <tr><td class="py-1.5 pr-2 text-muted-foreground">{formatDate(e.date)}</td><td class="py-1.5 pr-2">{e.person?.name}</td><td class="py-1.5 pr-2">{e.projectName}</td><td class="py-1.5 pr-2 text-muted-foreground">{e.description}</td><td class="py-1.5 text-right tabular-nums">{minutesLabel(e.minutes)}</td></tr>
            {:else}
              <tr><td class="py-6 text-center text-muted-foreground">No time logged.</td></tr>
            {/each}
          </tbody>
        </table>
      {:else if props.report === 'lineup'}
        {#if lineup.length}
          <div class="overflow-x-auto">
            <div class="relative min-w-[720px]">
              <div class="relative h-6 border-b text-[11px] text-muted-foreground">
                {#each months as m (m.label + m.left)}<span class="absolute top-0 border-l pl-1" style={`left:${m.left}%`}>{m.label}</span>{/each}
              </div>
              <div class="relative">
                <div class="pointer-events-none absolute inset-y-0 z-10 w-0.5 bg-ginger" style={`left:${pct(todayYmd())}%`} title="Today"></div>
                {#each lineup as p (p.id)}
                  {@const s = p.startOn ?? p.endOn ?? todayYmd()}
                  {@const e = p.endOn ?? addDaysYmd(s, 14)}
                  <div class="relative h-12 border-b border-dashed">
                    <Link href={`/projects/${p.id}`} class={cn('absolute top-2 flex h-8 items-center gap-1.5 overflow-hidden rounded-md px-2 text-xs font-semibold text-white no-underline shadow-sm hover:brightness-110', colorOf(p.color).strong)} style={`left:${pct(s)}%;width:max(${pct(e) - pct(s)}%, 90px)`} title={`${p.name}: ${formatDate(s)} – ${formatDate(e)}`}>
                      <ProjectMark project={p} size={18} class="bg-white/80" /><span class="truncate">{p.name}</span>
                    </Link>
                  </div>
                {/each}
              </div>
            </div>
          </div>
          <p class="mt-3 text-xs text-muted-foreground">Projects appear here once they have a start or end date (edit a project to add dates).</p>
        {:else}
          <p class="py-10 text-center text-muted-foreground">No projects have dates yet. Add start/end dates to a project to see it on the Lineup.</p>
        {/if}
      {/if}
    </Sheet>
  </div>
</AppShell>
