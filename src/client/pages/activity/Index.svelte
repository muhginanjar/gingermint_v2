<script lang="ts">
  /** Latest Activity: a Timeline grouped by day (filter by project / person / text) and a weekly Wrap-up. */
  import { Link, router } from '@inertiajs/svelte'
  import type { Activity, Person } from '../../../shared/models'
  import ActivityItem from '../../components/ActivityItem.svelte'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import AvatarStack from '../../components/ui/AvatarStack.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Select from '../../components/ui/Select.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import { api } from '../../lib/api'
  import * as icons from '../../lib/icons'
  import { addDaysYmd, dayKey, formatDay, localDate, todayYmd } from '../../lib/time'

  let {
    view,
    filters,
    projects,
    people,
    activities,
    range,
  }: {
    view: 'timeline' | 'wrapup'
    filters: { projectId: number; personId: number }
    projects: { id: number; name: string }[]
    people: Person[]
    activities: Activity[]
    range?: { from: string; to: string }
  } = $props()

  let tab = $state(view)
  let project = $state<string | number>(filters.projectId || '')
  let person = $state<string | number>(filters.personId || '')
  let filter = $state('')
  let items = $state<Activity[]>(activities)
  let more = $state(activities.length >= 80)
  let loading = $state(false)

  $effect(() => {
    items = activities
    more = activities.length >= 80
  })

  function apply(extra: Record<string, string> = {}) {
    const p = new URLSearchParams()
    if (tab === 'wrapup') p.set('view', 'wrapup')
    if (project) p.set('project', String(project))
    if (person) p.set('person', String(person))
    for (const [k, v] of Object.entries(extra)) p.set(k, v)
    router.get(`/activity${p.size ? `?${p}` : ''}`, {}, { preserveScroll: true })
  }

  async function loadMore() {
    const last = items.at(-1)
    if (!last) return
    loading = true
    const p = new URLSearchParams({ before: last.createdAt })
    if (project) p.set('project', String(project))
    if (person) p.set('person', String(person))
    const res = await api.get<{ activities: Activity[] }>(`/activity/more?${p}`)
    items = [...items, ...res.activities]
    more = res.activities.length >= 80
    loading = false
  }

  const q = $derived(filter.trim().toLowerCase())
  const shown = $derived(q ? items.filter((a) => `${a.title} ${a.excerpt} ${a.actor?.name ?? ''} ${a.projectName ?? ''}`.toLowerCase().includes(q)) : items)
  const days = $derived.by(() => {
    const m = new Map<string, Activity[]>()
    for (const a of shown) m.set(dayKey(a.createdAt), [...(m.get(dayKey(a.createdAt)) ?? []), a])
    return [...m.entries()]
  })
  const activePeople = (list: Activity[]) => {
    const seen = new Map<number, Person>()
    for (const a of list) if (a.actor) seen.set(a.actor.id, a.actor)
    return [...seen.values()]
  }
  const dayLabel = (d: string) => (d === todayYmd() ? `Today, ${localDate(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}` : localDate(d).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' }))

  // Wrap-up: per project, counts + highlights.
  const wrap = $derived.by(() => {
    const m = new Map<string, { name: string; id: number | null; items: Activity[] }>()
    for (const a of shown) {
      const k = String(a.projectId ?? 0)
      const g = m.get(k) ?? { name: a.projectName ?? 'Account', id: a.projectId, items: [] }
      g.items.push(a)
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => b.items.length - a.items.length)
  })
  const count = (list: Activity[], pred: (a: Activity) => boolean) => list.filter(pred).length
</script>

<AppShell tint="global" title="Latest Activity" crumbs={[{ label: 'Activity' }]}>
  <Sheet>
    <h1 class="text-[34px] font-black tracking-tight">Latest Activity</h1>
    <div class="mt-3 flex flex-wrap items-center gap-2 text-sm">
      <Tabs items={[{ value: 'timeline', label: 'Timeline' }, { value: 'wrapup', label: 'Wrap-up' }]} bind:value={tab} onchange={() => apply()} label="View" />
      <span class="text-muted-foreground">Showing</span>
      <Select bind:value={project} onchange={() => apply()} options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} class="h-8 w-48" aria-label="Project" />
      <span class="text-muted-foreground">by</span>
      <Select bind:value={person} onchange={() => apply()} options={[{ value: '', label: 'Everyone' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} class="h-8 w-40" aria-label="Person" />
      <input bind:value={filter} placeholder="Filter…" aria-label="Filter activity" class="h-8 w-40 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>

    {#if view === 'timeline'}
      {#each days as [day, list] (day)}
        <section class="mt-8">
          <div class="mb-4 flex items-center gap-3">
            <span class="rounded bg-foreground px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-background">{dayLabel(day)}</span>
            <span class="h-px flex-1 bg-border"></span>
            <span class="flex items-center gap-2 text-xs text-muted-foreground">{activePeople(list).length} people active <AvatarStack people={activePeople(list)} size={20} max={8} /></span>
          </div>
          <ol class="relative grid gap-4 border-l-2 border-border pl-5">
            {#each list as a (a.id)}<li><ActivityItem activity={a} /></li>{/each}
          </ol>
        </section>
      {:else}
        <p class="mt-10 text-center text-sm text-muted-foreground">No activity yet.</p>
      {/each}
      {#if more && !q}
        <div class="mt-6 text-center"><Button variant="outline" onclick={loadMore} disabled={loading}>{loading ? 'Loading…' : 'Show older activity'}</Button></div>
      {/if}
    {:else if range}
      <div class="mt-6 flex items-center gap-2">
        <Button variant="outline" size="icon-sm" aria-label="Previous week" onclick={() => apply({ to: addDaysYmd(range.to, -7) })}><Icon icon={icons.ChevronLeft} /></Button>
        <p class="font-bold">{formatDay(range.from)} – {formatDay(range.to)}</p>
        <Button variant="outline" size="icon-sm" aria-label="Next week" disabled={range.to >= todayYmd()} onclick={() => apply({ to: addDaysYmd(range.to, 7) })}><Icon icon={icons.ChevronRight} /></Button>
      </div>
      <div class="mt-6 grid gap-5 md:grid-cols-2">
        {#each wrap as g (g.name)}
          <article class="rounded-lg border p-4">
            <h2 class="font-black">{#if g.id}<Link href={`/projects/${g.id}`} class="hover:underline">{g.name}</Link>{:else}{g.name}{/if}</h2>
            <dl class="mt-3 grid grid-cols-4 gap-2 text-center">
              <div class="rounded bg-muted/60 p-2"><dt class="text-[11px] text-muted-foreground">Done</dt><dd class="text-xl font-black">{count(g.items, (a) => a.action === 'completed')}</dd></div>
              <div class="rounded bg-muted/60 p-2"><dt class="text-[11px] text-muted-foreground">Added</dt><dd class="text-xl font-black">{count(g.items, (a) => a.action.startsWith('added') || a.action === 'posted' || a.action === 'scheduled')}</dd></div>
              <div class="rounded bg-muted/60 p-2"><dt class="text-[11px] text-muted-foreground">Comments</dt><dd class="text-xl font-black">{count(g.items, (a) => a.action === 'commented')}</dd></div>
              <div class="rounded bg-muted/60 p-2"><dt class="text-[11px] text-muted-foreground">People</dt><dd class="text-xl font-black">{activePeople(g.items).length}</dd></div>
            </dl>
            <ul class="mt-3 grid gap-2">
              {#each g.items.filter((a) => a.action === 'completed' || a.action === 'posted' || a.recordableType === 'doc').slice(0, 5) as a (a.id)}
                <li><ActivityItem activity={a} compact showProject={false} /></li>
              {/each}
            </ul>
          </article>
        {:else}
          <p class="text-sm text-muted-foreground">A quiet week.</p>
        {/each}
      </div>
    {/if}
  </Sheet>
</AppShell>
