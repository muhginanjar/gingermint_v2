<script lang="ts">
  /** Timesheet: log time (1:30, 1.5, 90m) against the project or a to-do; totals by person. */
  import { router } from '@inertiajs/svelte'
  import type { Person, ProjectRef, TimeEntry } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Select from '../../components/ui/Select.svelte'
  import * as icons from '../../lib/icons'
  import { formatDay, minutesLabel, todayYmd } from '../../lib/time'

  let {
    project,
    entries,
    range,
    todos,
    people,
    canLogForOthers,
    errors = {},
  }: {
    project: ProjectRef
    entries: TimeEntry[]
    range: { from: string; to: string }
    todos: { id: number; title: string }[]
    people: Person[]
    canLogForOthers: boolean
    errors?: Record<string, string>
  } = $props()

  let form = $state({ date: todayYmd(), duration: '', description: '', todoId: '' as string | number, personId: '' as string | number })
  let from = $state(range.from)
  let to = $state(range.to)

  const total = $derived(entries.reduce((s, e) => s + e.minutes, 0))
  const byPerson = $derived.by(() => {
    const m = new Map<number, { person: Person | null; minutes: number }>()
    for (const e of entries) {
      const k = e.person?.id ?? 0
      const g = m.get(k) ?? { person: e.person, minutes: 0 }
      g.minutes += e.minutes
      m.set(k, g)
    }
    return [...m.values()].sort((a, b) => b.minutes - a.minutes)
  })

  function submit(e: SubmitEvent) {
    e.preventDefault()
    router.post(`/projects/${project.id}/timesheet`, { ...form, todoId: form.todoId || null, personId: form.personId || null }, {
      preserveScroll: true,
      onSuccess: () => (form = { ...form, duration: '', description: '', todoId: '' }),
    })
  }
</script>

<ProjectShell {project} tool="timesheet">
  <SheetHeader title="Timesheet" center subtitle={`${minutesLabel(total)} logged ${formatDay(range.from)} – ${formatDay(range.to)}`} />
  <div class="mx-auto max-w-4xl">
    <form onsubmit={submit} class="grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[150px_110px_1fr_auto] sm:items-end">
      <Field id="t-date" label="Date" error={errors.date}><Input id="t-date" type="date" bind:value={form.date} /></Field>
      <Field id="t-dur" label="Time" error={errors.duration}><Input id="t-dur" bind:value={form.duration} placeholder="1:30" /></Field>
      <Field id="t-desc" label="What did you work on?"><Input id="t-desc" bind:value={form.description} placeholder="Design review, client call…" /></Field>
      <Button type="submit" disabled={!form.duration.trim()}><Icon icon={icons.Timer} /> Log time</Button>
      <Field id="t-todo" label="For a to-do (optional)" class="sm:col-span-2">
        <Select id="t-todo" bind:value={form.todoId} options={[{ value: '', label: '— The project in general —' }, ...todos.map((t) => ({ value: t.id, label: t.title }))]} />
      </Field>
      {#if canLogForOthers}
        <Field id="t-person" label="On behalf of" class="sm:col-span-2">
          <Select id="t-person" bind:value={form.personId} options={[{ value: '', label: 'Me' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
        </Field>
      {/if}
    </form>

    <div class="mt-6 flex flex-wrap items-end gap-2">
      <Field id="r-from" label="From"><Input id="r-from" type="date" bind:value={from} class="w-40" /></Field>
      <Field id="r-to" label="To"><Input id="r-to" type="date" bind:value={to} class="w-40" /></Field>
      <Button variant="outline" onclick={() => router.get(`/projects/${project.id}/timesheet?from=${from}&to=${to}`)}>Show</Button>
    </div>

    {#if byPerson.length}
      <div class="mt-6 flex flex-wrap gap-3">
        {#each byPerson as g (g.person?.id ?? 0)}
          <div class="flex items-center gap-2 rounded-lg border px-3 py-2"><Avatar person={g.person} size={24} /><span class="text-sm font-semibold">{g.person?.name ?? 'Former member'}</span><span class="text-sm tabular-nums text-muted-foreground">{minutesLabel(g.minutes)}</span></div>
        {/each}
      </div>
    {/if}

    <table class="mt-6 w-full text-sm">
      <thead class="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
        <tr><th class="py-2 font-semibold">Date</th><th class="py-2 font-semibold">Person</th><th class="py-2 font-semibold">Work</th><th class="py-2 text-right font-semibold">Time</th><th></th></tr>
      </thead>
      <tbody class="divide-y">
        {#each entries as e (e.id)}
          <tr class="group">
            <td class="whitespace-nowrap py-2 pr-3">{formatDay(e.date)}</td>
            <td class="py-2 pr-3"><span class="flex items-center gap-1.5"><Avatar person={e.person} size={20} />{e.person?.name.split(' ')[0]}</span></td>
            <td class="py-2 pr-3">{e.description || '—'}{#if e.todo}<a href={`/projects/${project.id}/todos/${e.todo.id}`} class="ml-1 text-link underline">{e.todo.title}</a>{/if}</td>
            <td class="py-2 text-right font-semibold tabular-nums">{minutesLabel(e.minutes)}</td>
            <td class="w-8 py-2 text-right"><button type="button" class="invisible rounded p-1 text-muted-foreground hover:text-destructive group-hover:visible" aria-label="Delete entry" onclick={() => confirm('Delete this entry?') && router.delete(`/projects/${project.id}/timesheet/${e.id}`, { preserveScroll: true })}><Icon icon={icons.X} size={14} /></button></td>
          </tr>
        {:else}
          <tr><td colspan="5" class="py-8 text-center text-muted-foreground">No time logged in this range.</td></tr>
        {/each}
      </tbody>
    </table>
  </div>
</ProjectShell>
