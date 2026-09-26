<script lang="ts">
  /**
   * To-dos: Loose To-dos (no list needed) + lists with progress, "View as"
   * (lists / by person / by due date), live filtering, hide completed lists,
   * drag a to-do between lists, and a Hill Chart for tracked lists.
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { HillUpdate, Person, ProjectRef, Todo, TodoList } from '../../../shared/models'
  import HillChart from '../../components/HillChart.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import TodoComposer from '../../components/TodoComposer.svelte'
  import TodoListDialog from '../../components/TodoListDialog.svelte'
  import TodoRow from '../../components/TodoRow.svelte'
  import Button from '../../components/ui/Button.svelte'
  import EmptyState from '../../components/ui/EmptyState.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Popover from '../../components/ui/Popover.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { addDaysYmd, todayYmd } from '../../lib/time'

  let {
    project,
    lists,
    todos,
    hillUpdates,
    people,
  }: { project: ProjectRef; lists: TodoList[]; todos: Todo[]; hillUpdates: HillUpdate[]; people: Person[] } = $props()

  const isClient = $derived(project.myRole === 'client')
  let view = $state('lists')
  let filter = $state('')
  let hideCompleted = $state(true)
  let composer = $state<string | null>(null)
  let listDialog = $state(false)
  let editList = $state<TodoList | null>(null)
  let showDone = $state<Record<string, boolean>>({})
  let draggingId = $state<number | null>(null)
  let dropOn = $state<string | null>(null)

  const q = $derived(filter.trim().toLowerCase())
  const match = (t: Todo) => !q || `${t.title} ${t.notes} ${t.assignees.map((a) => a.name).join(' ')}`.toLowerCase().includes(q)
  const loose = $derived(todos.filter((t) => !t.listId && match(t)))
  const byList = $derived(new Map(lists.map((l) => [l.id, todos.filter((t) => t.listId === l.id && match(t))])))
  const visibleLists = $derived(
    lists.filter((l) => {
      if (hideCompleted && l.total > 0 && l.completed === l.total && !q) return false
      if (q && !(byList.get(l.id) ?? []).length && !l.name.toLowerCase().includes(q)) return false
      return true
    }),
  )
  const hiddenCount = $derived(lists.length - visibleLists.length)
  const tracked = $derived(lists.filter((l) => l.hillTracked))
  const open = $derived(todos.filter((t) => !t.completedAt && match(t)))

  const byPerson = $derived.by(() => {
    const groups = new Map<string, { person: Person | null; items: Todo[] }>()
    for (const t of open) {
      const who = t.assignees.length ? t.assignees : [null]
      for (const p of who) {
        const key = p ? String(p.id) : 'none'
        const g = groups.get(key) ?? { person: p, items: [] }
        g.items.push(t)
        groups.set(key, g)
      }
    }
    return [...groups.values()].sort((a, b) => (a.person ? a.person.name : '~').localeCompare(b.person ? b.person.name : '~'))
  })

  const byDue = $derived.by(() => {
    const today = todayYmd()
    const week = addDaysYmd(today, 7)
    const buckets: { label: string; items: Todo[]; tone?: string }[] = [
      { label: 'Overdue', items: [], tone: 'text-destructive' },
      { label: 'Due today', items: [], tone: 'text-ginger' },
      { label: 'Next 7 days', items: [] },
      { label: 'Later', items: [] },
      { label: 'No due date', items: [] },
    ]
    for (const t of open) {
      const d = t.dueOn
      const i = !d ? 4 : d < today ? 0 : d === today ? 1 : d <= week ? 2 : 3
      buckets[i]?.items.push(t)
    }
    for (const b of buckets) b.items.sort((x, y) => (x.dueOn ?? '').localeCompare(y.dueOn ?? ''))
    return buckets.filter((b) => b.items.length)
  })

  function drop(target: number | null) {
    const id = draggingId
    draggingId = null
    dropOn = null
    if (id === null) return
    const t = todos.find((x) => x.id === id)
    if (!t || t.listId === target) return
    router.post(`/projects/${project.id}/todos/${id}/move`, { listId: target }, { preserveScroll: true })
  }

  const dz = (key: string, target: number | null) => ({
    ondragover: (e: DragEvent) => {
      if (draggingId === null) return
      e.preventDefault()
      dropOn = key
    },
    ondragleave: () => dropOn === key && (dropOn = null),
    ondrop: () => drop(target),
  })
</script>

{#snippet items(list: Todo[], key: string, listId: number | null)}
  {@const openItems = list.filter((t) => !t.completedAt)}
  {@const doneItems = list.filter((t) => t.completedAt)}
  <div class={cn('rounded-md transition-colors', dropOn === key && 'bg-accent/60 ring-2 ring-primary/40')} {...dz(key, listId)}>
    {#each openItems as t (t.id)}
      <TodoRow todo={t} projectId={project.id} draggable={!isClient} ondragstart={() => (draggingId = t.id)} canComplete={!isClient || t.assignees.length > 0} />
    {/each}
    {#if composer === key}
      <TodoComposer projectId={project.id} {listId} {people} oncancel={() => (composer = null)} />
    {:else if !isClient}
      <button type="button" onclick={() => (composer = key)} class="ml-7 mt-1 rounded px-1.5 py-1 text-sm font-medium text-link hover:bg-muted">Add a to-do</button>
    {/if}
    {#if doneItems.length}
      <button type="button" class="ml-7 mt-2 text-xs text-muted-foreground hover:text-foreground hover:underline" onclick={() => (showDone = { ...showDone, [key]: !showDone[key] })}>
        {showDone[key] ? 'Hide' : 'Show'} {doneItems.length} completed
      </button>
      {#if showDone[key]}
        {#each doneItems as t (t.id)}<TodoRow todo={t} projectId={project.id} canComplete={!isClient} />{/each}
      {/if}
    {/if}
  </div>
{/snippet}

<ProjectShell {project} tool="todos">
  <SheetHeader title="To-dos" center>
    {#snippet actions()}
      {#if !isClient}
        <Button onclick={() => { editList = null; listDialog = true }}><Icon icon={icons.Plus} /> New list</Button>
      {/if}
    {/snippet}
    {#snippet controls()}
      <Tabs items={[{ value: 'lists', label: 'Lists' }, { value: 'people', label: 'By person' }, { value: 'due', label: 'By due date' }]} bind:value={view} label="View as" />
      <input bind:value={filter} placeholder="Filter…" aria-label="Filter to-dos" class="h-8 w-40 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {#if view === 'lists'}
        <label class="flex items-center gap-2 text-sm text-muted-foreground"><Switch bind:checked={hideCompleted} label="Hide completed lists" /> Hide completed lists</label>
      {/if}
    {/snippet}
  </SheetHeader>

  <div class="mx-auto max-w-3xl">
    {#if tracked.length && view === 'lists'}
      <div class="mb-8"><HillChart lists={tracked} updates={hillUpdates} editable={!isClient} onmove={(id, position) => router.post(`/projects/${project.id}/todos/lists/${id}/hill`, { position }, { preserveScroll: true })} /></div>
    {/if}

    {#if view === 'lists'}
      {#if !isClient}
        <section class="mb-8">
          <h2 class="mb-1 flex items-center gap-2 text-lg font-black">Loose to-dos <span class="text-xs font-normal text-muted-foreground">— capture now, file later</span></h2>
          {@render items(loose, 'loose', null)}
        </section>
      {/if}

      {#each visibleLists as l (l.id)}
        <section class="mb-8" aria-label={l.name}>
          <header class="group flex items-start gap-2">
            <div class="min-w-0 flex-1">
              <h2 class="text-lg font-black leading-snug">
                <Link href={`/projects/${project.id}/todos/lists/${l.id}`} class="hover:underline">{l.name}</Link>
                {#if l.clientVisible && !isClient}<span class="ml-1 rounded bg-amber-100 px-1.5 py-0.5 align-middle text-[11px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">The client sees this</span>{/if}
              </h2>
              <div class="mt-1 flex items-center gap-2">
                <div class="h-1.5 w-28 overflow-hidden rounded-full bg-muted"><div class="h-full bg-primary" style={`width:${l.total ? (l.completed / l.total) * 100 : 0}%`}></div></div>
                <span class="text-xs text-muted-foreground">{l.completed}/{l.total} completed</span>
                {#if l.hillTracked}<Icon icon={icons.Mountain} size={13} class="text-muted-foreground" label="On the hill chart" />{/if}
              </div>
              {#if l.description}<p class="mt-1 text-sm text-muted-foreground">{l.description}</p>{/if}
            </div>
            {#if !isClient}
              <Popover align="end" contentClass="w-56">
                {#snippet trigger({ toggle })}
                  <button type="button" onclick={toggle} class="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`${l.name} options`}><Icon icon={icons.Ellipsis} /></button>
                {/snippet}
                {#snippet children({ close })}
                  <MenuItem icon={icons.Pencil} onclick={() => { close(); editList = l; listDialog = true }}>Edit list</MenuItem>
                  <MenuItem icon={icons.Mountain} onclick={() => { close(); router.post(`/projects/${project.id}/todos/lists/${l.id}/track`, { tracked: !l.hillTracked }, { preserveScroll: true }) }}>{l.hillTracked ? 'Remove from hill chart' : 'Track on the hill chart'}</MenuItem>
                  <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm(`Delete “${l.name}” and all its to-dos?`) && router.delete(`/projects/${project.id}/todos/lists/${l.id}`, { preserveScroll: true }) }}>Delete list</MenuItem>
                {/snippet}
              </Popover>
            {/if}
          </header>
          <div class="mt-2">{@render items(byList.get(l.id) ?? [], `list-${l.id}`, l.id)}</div>
        </section>
      {/each}

      {#if hiddenCount > 0}
        <button type="button" class="text-sm text-muted-foreground underline" onclick={() => (hideCompleted = false)}>Show {hiddenCount} completed {hiddenCount === 1 ? 'list' : 'lists'}</button>
      {/if}
      {#if !lists.length && !loose.length && isClient}
        <EmptyState icon={icons.ListTodo} title="Nothing shared with you yet" />
      {/if}
    {:else if view === 'people'}
      {#each byPerson as g (g.person?.id ?? 'none')}
        <section class="mb-6">
          <h2 class="mb-1 font-black">{g.person?.name ?? 'Unassigned'} <span class="text-sm font-normal text-muted-foreground">· {g.items.length}</span></h2>
          {#each g.items as t (t.id)}<TodoRow todo={t} projectId={project.id} canComplete={!isClient} />{/each}
        </section>
      {:else}
        <EmptyState icon={icons.CircleCheck} title="No open to-dos" />
      {/each}
    {:else}
      {#each byDue as b (b.label)}
        <section class="mb-6">
          <h2 class={cn('mb-1 font-black', b.tone)}>{b.label} <span class="text-sm font-normal text-muted-foreground">· {b.items.length}</span></h2>
          {#each b.items as t (t.id)}<TodoRow todo={t} projectId={project.id} canComplete={!isClient} />{/each}
        </section>
      {:else}
        <EmptyState icon={icons.CircleCheck} title="No open to-dos" />
      {/each}
    {/if}
  </div>
</ProjectShell>

<TodoListDialog bind:open={listDialog} projectId={project.id} list={editList} />
