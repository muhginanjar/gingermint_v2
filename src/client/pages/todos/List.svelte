<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Comment, Person, ProjectRef, Todo, TodoList } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import TodoComposer from '../../components/TodoComposer.svelte'
  import TodoListDialog from '../../components/TodoListDialog.svelte'
  import TodoRow from '../../components/TodoRow.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import * as icons from '../../lib/icons'

  let {
    project,
    list,
    todos,
    people,
    comments,
    bookmarked,
  }: { project: ProjectRef; list: TodoList; todos: Todo[]; people: Person[]; comments: Comment[]; bookmarked: boolean } = $props()

  const isClient = $derived(project.myRole === 'client')
  let composing = $state(false)
  let editOpen = $state(false)
  const openItems = $derived(todos.filter((t) => !t.completedAt))
  const doneItems = $derived(todos.filter((t) => t.completedAt))
</script>

<ProjectShell {project} tool="todos" title={list.name} crumbs={[{ label: list.name }]}>
  <div class="mx-auto max-w-3xl">
    <RecordBar backHref={`/projects/${project.id}/todos`} backLabel="All to-do lists" type="todo_list" id={list.id} title={list.name} context={project.name} {bookmarked}>
      {#snippet menu({ close })}
        {#if !isClient}
          <MenuItem icon={icons.Pencil} onclick={() => { close(); editOpen = true }}>Edit list</MenuItem>
          <MenuItem icon={icons.Mountain} onclick={() => { close(); router.post(`/projects/${project.id}/todos/lists/${list.id}/track`, { tracked: !list.hillTracked }) }}>{list.hillTracked ? 'Remove from hill chart' : 'Track on the hill chart'}</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this list and all its to-dos?') && router.delete(`/projects/${project.id}/todos/lists/${list.id}`) }}>Delete list</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>
    <h1 class="text-3xl font-black tracking-tight">{list.name}</h1>
    <p class="mt-1 text-sm text-muted-foreground">{list.completed}/{list.total} completed</p>
    {#if list.description}<p class="mt-2 text-muted-foreground">{list.description}</p>{/if}
    <div class="mt-6">
      {#each openItems as t (t.id)}<TodoRow todo={t} projectId={project.id} canComplete={!isClient || t.assignees.length > 0} />{/each}
      {#if composing}
        <TodoComposer projectId={project.id} listId={list.id} {people} oncancel={() => (composing = false)} />
      {:else if !isClient}
        <button type="button" onclick={() => (composing = true)} class="ml-7 mt-1 rounded px-1.5 py-1 text-sm font-medium text-link hover:bg-muted">Add a to-do</button>
      {/if}
      {#if doneItems.length}
        <h2 class="mt-6 text-xs font-bold uppercase tracking-wide text-muted-foreground">Completed</h2>
        {#each doneItems as t (t.id)}<TodoRow todo={t} projectId={project.id} canComplete={!isClient} />{/each}
      {/if}
    </div>
    <CommentThread type="todo_list" id={list.id} {comments} {people} projectId={project.id} />
  </div>
</ProjectShell>

<TodoListDialog bind:open={editOpen} projectId={project.id} {list} />
