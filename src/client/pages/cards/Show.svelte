<script lang="ts">
  /** A card: column (move), assignees, due date, notes, steps, comments. */
  import { router } from '@inertiajs/svelte'
  import type { CardDetail, Color, Comment, Person, ProjectRef } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import PeoplePicker from '../../components/PeoplePicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Checkbox from '../../components/ui/Checkbox.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Select from '../../components/ui/Select.svelte'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'
  import { dueLabel, formatDate, formatDateTime } from '../../lib/time'

  let {
    project,
    card,
    columns,
    people,
    comments,
    subscribed,
    bookmarked,
  }: {
    project: ProjectRef
    card: CardDetail
    columns: { id: number; name: string; color: Color; kind: string }[]
    people: Person[]
    comments: Comment[]
    subscribed: boolean
    bookmarked: boolean
  } = $props()

  let editing = $state(false)
  let form = $state({ title: '', body: '', dueOn: '', assigneeIds: [] as number[] })
  let step = $state({ title: '', assigneeId: '' as number | string, dueOn: '' })
  let columnId = $state(card.column.id)

  $effect(() => {
    columnId = card.column.id
  })

  function startEdit() {
    form = { title: card.title, body: card.body, dueOn: card.dueOn ?? '', assigneeIds: card.assignees.map((p) => p.id) }
    editing = true
  }

  const save = () => router.patch(`/projects/${project.id}/cards/${card.id}`, { ...form, dueOn: form.dueOn || null }, { preserveScroll: true, onSuccess: () => (editing = false) })
  const moveTo = (id: number) => router.post(`/projects/${project.id}/cards/${card.id}/move`, { columnId: id }, { preserveScroll: true })

  function addStep(e: SubmitEvent) {
    e.preventDefault()
    router.post(`/projects/${project.id}/cards/${card.id}/steps`, { ...step, assigneeId: step.assigneeId || null, dueOn: step.dueOn || null }, {
      preserveScroll: true,
      onSuccess: () => (step = { title: '', assigneeId: '', dueOn: '' }),
    })
  }

  const due = $derived(dueLabel(card.dueOn))
</script>

<ProjectShell {project} tool="card_table" title={card.title} crumbs={[{ label: card.title }]}>
  <div class="mx-auto max-w-3xl">
    <RecordBar backHref={`/projects/${project.id}/cards`} backLabel="Card Table" type="card" id={card.id} title={card.title} context={project.name} {bookmarked} {subscribed}>
      {#snippet menu({ close })}
        <MenuItem icon={icons.Pencil} onclick={() => { close(); startEdit() }}>Edit</MenuItem>
        <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this card?') && router.delete(`/projects/${project.id}/cards/${card.id}`) }}>Delete</MenuItem>
      {/snippet}
    </RecordBar>

    <div class="mb-3 flex flex-wrap items-center gap-2 text-sm">
      <span class={cn('h-2.5 w-2.5 rounded-full', colorOf(card.column.color).dot)}></span>
      <span class="text-muted-foreground">In</span>
      <Select bind:value={columnId} options={columns.map((c) => ({ value: c.id, label: c.name }))} class="h-8 w-48" aria-label="Move to column" onchange={() => moveTo(Number(columnId))} />
      {#if card.onHold}<span class="rounded bg-muted px-1.5 py-0.5 text-xs font-semibold">On hold</span>{/if}
    </div>

    {#if editing}
      <div class="grid gap-4">
        <Input bind:value={form.title} class="h-12 text-xl font-bold" aria-label="Title" />
        <div class="grid gap-4 sm:grid-cols-[1fr_180px]">
          <PeoplePicker {people} bind:selected={form.assigneeIds} placeholder="Assign to…" label="Assigned to" />
          <Input type="date" bind:value={form.dueOn} aria-label="Due on" />
        </div>
        <RichEditor bind:value={form.body} {people} projectId={project.id} rows={8} placeholder="Add notes…" />
        <div class="flex gap-2"><Button onclick={save}>Save changes</Button><Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button></div>
      </div>
    {:else}
      <div class="flex items-start gap-2">
        <h1 class="text-3xl font-black tracking-tight">{card.title}</h1>
        <Button variant="ghost" size="sm" class="ml-auto" onclick={startEdit}><Icon icon={icons.Pencil} /> Edit</Button>
      </div>
      <dl class="mt-5 grid gap-x-4 gap-y-3 sm:grid-cols-[120px_1fr]">
        <dt class="text-sm font-bold sm:text-right">Assigned to</dt>
        <dd class="flex flex-wrap gap-2 text-sm">{#each card.assignees as p (p.id)}<span class="flex items-center gap-1.5"><Avatar person={p} size={22} />{p.name}</span>{:else}<span class="text-muted-foreground">Nobody yet</span>{/each}</dd>
        <dt class="text-sm font-bold sm:text-right">Due on</dt>
        <dd class={cn('text-sm', due?.tone === 'overdue' && 'font-semibold text-destructive')}>{card.dueOn ? formatDate(card.dueOn, { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'}</dd>
        <dt class="text-sm font-bold sm:text-right">Notes</dt>
        <dd>{#if card.body}<RichText body={card.body} />{:else}<span class="text-sm text-muted-foreground">No notes.</span>{/if}</dd>
      </dl>
    {/if}

    <section class="mt-8">
      <h2 class="mb-2 font-black">Steps {#if card.steps.length}<span class="text-sm font-normal text-muted-foreground">{card.steps.filter((s) => s.completedAt).length}/{card.steps.length}</span>{/if}</h2>
      <ul class="grid gap-1">
        {#each card.steps as s (s.id)}
          <li class="group flex items-center gap-2.5 rounded-md py-1 hover:bg-muted/40">
            <Checkbox checked={!!s.completedAt} label={`Complete ${s.title}`} onchange={(v) => router.patch(`/projects/${project.id}/cards/steps/${s.id}`, { done: v }, { preserveScroll: true })} />
            <span class={cn('flex-1 text-sm', s.completedAt && 'text-muted-foreground line-through')}>{s.title}</span>
            {#if s.assignee}<span class="flex items-center gap-1 text-xs text-muted-foreground"><Avatar person={s.assignee} size={16} />{s.assignee.name.split(' ')[0]}</span>{/if}
            {#if s.dueOn}<span class="text-xs text-muted-foreground">{formatDate(s.dueOn)}</span>{/if}
            <button type="button" class="invisible rounded p-1 text-muted-foreground hover:text-destructive group-hover:visible" aria-label="Delete step" onclick={() => router.delete(`/projects/${project.id}/cards/steps/${s.id}`, { preserveScroll: true })}><Icon icon={icons.X} size={13} /></button>
          </li>
        {/each}
      </ul>
      <form onsubmit={addStep} class="mt-2 flex flex-wrap gap-2">
        <Input bind:value={step.title} placeholder="Add a step…" aria-label="Step" class="min-w-[12rem] flex-1" />
        <Select bind:value={step.assigneeId} options={[{ value: '', label: 'Anyone' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} class="w-40" aria-label="Step assignee" />
        <Input type="date" bind:value={step.dueOn} class="w-40" aria-label="Step due date" />
        <Button type="submit" variant="outline" disabled={!step.title.trim()}>Add step</Button>
      </form>
    </section>
    <p class="mt-6 text-xs text-muted-foreground">Added by {card.createdBy?.name ?? 'someone'} · {formatDateTime(card.createdAt)}</p>

    <CommentThread type="card" id={card.id} {comments} {people} projectId={project.id} />
  </div>
</ProjectShell>
