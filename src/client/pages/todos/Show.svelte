<script lang="ts">
  /** A to-do: assignees, due date, "when done notify", notes, subtasks, comments. */
  import { Link, router } from '@inertiajs/svelte'
  import type { Comment, Person, ProjectRef, TodoDetail } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import PeoplePicker from '../../components/PeoplePicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import RichText from '../../components/RichText.svelte'
  import TodoRow from '../../components/TodoRow.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Checkbox from '../../components/ui/Checkbox.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import { api } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { dueLabel, formatDate, formatDateTime } from '../../lib/time'

  let {
    project,
    todo,
    people,
    comments,
    subscribed,
    bookmarked,
    errors = {},
  }: { project: ProjectRef; todo: TodoDetail; people: Person[]; comments: Comment[]; subscribed: boolean; bookmarked: boolean; errors?: Record<string, string> } = $props()

  const isClient = $derived(project.myRole === 'client')
  let editing = $state(false)
  let form = $state({ title: '', notes: '', dueOn: '', assigneeIds: [] as number[], notifyIds: [] as number[] })
  let sub = $state({ title: '', assigneeIds: [] as number[], dueMode: 'none', dueOn: '' })
  let addingSub = $state(false)

  function startEdit() {
    form = {
      title: todo.title,
      notes: todo.notes,
      dueOn: todo.dueOn ?? '',
      assigneeIds: todo.assignees.map((p) => p.id),
      notifyIds: todo.notifyOnDone.map((p) => p.id),
    }
    editing = true
  }

  function save() {
    router.patch(`/projects/${project.id}/todos/${todo.id}`, { ...form, dueOn: form.dueOn || null }, { preserveScroll: true, onSuccess: () => (editing = false) })
  }

  async function toggle(done: boolean) {
    await api.post(`/projects/${project.id}/todos/${todo.id}/complete`, { done })
    router.reload()
  }

  function addSubtask(e: SubmitEvent) {
    e.preventDefault()
    router.post(
      `/projects/${project.id}/todos`,
      { title: sub.title, parentId: todo.id, assigneeIds: sub.assigneeIds, dueOn: sub.dueMode === 'day' ? sub.dueOn : null },
      { preserveScroll: true, onSuccess: () => (sub = { title: '', assigneeIds: [], dueMode: 'none', dueOn: '' }) },
    )
  }

  const due = $derived(dueLabel(todo.dueOn))
  const backHref = $derived(todo.parent ? `/projects/${project.id}/todos/${todo.parent.id}` : todo.list ? `/projects/${project.id}/todos/lists/${todo.list.id}` : `/projects/${project.id}/todos`)
</script>

<ProjectShell {project} tool="todos" title={todo.title} crumbs={[...(todo.list ? [{ label: todo.list.name, href: `/projects/${project.id}/todos/lists/${todo.list.id}` }] : []), { label: todo.title }]}>
  <div class="mx-auto max-w-3xl">
    <RecordBar {backHref} backLabel={todo.parent ? todo.parent.title : todo.list ? todo.list.name : 'To-dos'} type="todo" id={todo.id} title={todo.title} context={project.name} {bookmarked} {subscribed}>
      {#snippet menu({ close })}
        {#if !isClient}
          <MenuItem icon={icons.Pencil} onclick={() => { close(); startEdit() }}>Edit</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this to-do?') && router.delete(`/projects/${project.id}/todos/${todo.id}`) }}>Delete</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>

    {#if todo.parent}<p class="mb-1 text-sm text-muted-foreground">Subtask of <Link href={`/projects/${project.id}/todos/${todo.parent.id}`} class="text-link underline">{todo.parent.title}</Link></p>{/if}

    {#if editing}
      <div class="grid gap-4">
        <Input bind:value={form.title} class="h-12 text-xl font-bold" aria-label="To-do" />
        {#if errors.title}<p class="text-sm text-destructive">{errors.title}</p>{/if}
        <dl class="grid gap-4 sm:grid-cols-[130px_1fr] sm:items-center">
          <dt class="text-sm font-bold sm:text-right">Assigned to</dt>
          <dd><PeoplePicker {people} bind:selected={form.assigneeIds} placeholder="Type names to assign…" label="Assigned to" /></dd>
          <dt class="text-sm font-bold sm:text-right">Due on</dt>
          <dd><Input type="date" bind:value={form.dueOn} class="w-48" aria-label="Due on" /></dd>
          <dt class="text-sm font-bold sm:text-right">When done</dt>
          <dd><PeoplePicker {people} bind:selected={form.notifyIds} placeholder="Notify these people…" label="When done, notify" /></dd>
          <dt class="self-start pt-2 text-sm font-bold sm:text-right">Notes</dt>
          <dd><RichEditor bind:value={form.notes} {people} projectId={project.id} rows={5} placeholder="Add extra details or attach a file…" label="Notes" /></dd>
        </dl>
        <div class="flex gap-2 sm:pl-[146px]">
          <Button onclick={save}>Save changes</Button>
          <Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button>
        </div>
      </div>
    {:else}
      <div class="flex items-start gap-3">
        <Checkbox checked={!!todo.completedAt} onchange={toggle} label="Complete" class="mt-2 h-6 w-6" disabled={isClient && !todo.assignees.length} />
        <h1 class={cn('text-2xl font-black leading-tight tracking-tight sm:text-3xl', todo.completedAt && 'text-muted-foreground line-through')}>{todo.title}</h1>
        {#if !isClient}<Button variant="ghost" size="sm" class="ml-auto" onclick={startEdit}><Icon icon={icons.Pencil} /> Edit</Button>{/if}
      </div>
      {#if todo.completedAt}<p class="ml-9 mt-1 text-sm text-primary">Completed by {todo.completedBy?.name ?? 'someone'} · {formatDateTime(todo.completedAt)}</p>{/if}

      <dl class="mt-6 grid gap-x-4 gap-y-4 sm:grid-cols-[130px_1fr]">
        <dt class="text-sm font-bold sm:text-right">Assigned to</dt>
        <dd class="flex flex-wrap gap-2 text-sm">
          {#each todo.assignees as p (p.id)}<span class="flex items-center gap-1.5"><Avatar person={p} size={22} />{p.name}</span>{:else}<span class="text-muted-foreground">Nobody yet</span>{/each}
        </dd>
        <dt class="text-sm font-bold sm:text-right">Due on</dt>
        <dd class={cn('flex items-center gap-1.5 text-sm', due?.tone === 'overdue' && !todo.completedAt && 'font-semibold text-destructive')}>
          <Icon icon={icons.Calendar} class="text-link" />{todo.dueOn ? formatDate(todo.dueOn, { weekday: 'short', month: 'short', day: 'numeric' }) : 'No due date'}
        </dd>
        <dt class="text-sm font-bold sm:text-right">When done</dt>
        <dd class="text-sm">{#if todo.notifyOnDone.length}Notify {todo.notifyOnDone.map((p) => p.name).join(', ')}{:else}<span class="text-muted-foreground">Notify these people…</span>{/if}</dd>
        <dt class="text-sm font-bold sm:text-right">Notes</dt>
        <dd>{#if todo.notes}<RichText body={todo.notes} />{:else}<span class="text-sm text-muted-foreground">Add extra details or attach a file…</span>{/if}</dd>

        {#if !todo.parentId}
          <dt class="text-sm font-bold sm:text-right">Subtasks</dt>
          <dd>
            {#each todo.subtasks as s (s.id)}<TodoRow todo={s} projectId={project.id} canComplete={!isClient} />{/each}
            {#if !isClient}
              {#if addingSub}
                <form onsubmit={addSubtask} class="mt-2 grid gap-3 rounded-lg border bg-muted/30 p-3">
                  <Input bind:value={sub.title} placeholder="Describe the subtask…" aria-label="Subtask" autofocus />
                  <div class="grid gap-3 sm:grid-cols-[110px_1fr] sm:items-center">
                    <span class="text-sm font-semibold sm:text-right">Assigned to</span>
                    <PeoplePicker {people} bind:selected={sub.assigneeIds} placeholder="Type names to assign…" label="Subtask assignees" />
                    <span class="self-start text-sm font-semibold sm:text-right">Due on</span>
                    <div class="grid gap-1.5 text-sm">
                      <label class="flex items-center gap-2"><input type="radio" bind:group={sub.dueMode} value="none" /> No due date</label>
                      <label class="flex items-center gap-2"><input type="radio" bind:group={sub.dueMode} value="day" /> A specific day</label>
                      {#if sub.dueMode === 'day'}<Input type="date" bind:value={sub.dueOn} class="w-48" aria-label="Subtask due date" />{/if}
                    </div>
                  </div>
                  <div class="flex gap-2">
                    <Button type="submit" size="sm" disabled={!sub.title.trim()}>Add subtask</Button>
                    <Button size="sm" variant="outline" onclick={() => (addingSub = false)}>Cancel</Button>
                  </div>
                </form>
              {:else}
                <button type="button" class="mt-1 text-sm font-medium text-link hover:underline" onclick={() => (addingSub = true)}>+ Add a subtask</button>
              {/if}
            {/if}
          </dd>
        {/if}
      </dl>
      <p class="mt-6 text-xs text-muted-foreground">Added by {todo.createdBy?.name ?? 'someone'} · {formatDateTime(todo.createdAt)}</p>
    {/if}

    <CommentThread type="todo" id={todo.id} {comments} {people} projectId={project.id} />
  </div>
</ProjectShell>
