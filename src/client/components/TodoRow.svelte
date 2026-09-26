<script lang="ts">
  /** One to-do line: check, title, assignees, due date, notes/comments/subtask indicators. */
  import { Link, router } from '@inertiajs/svelte'
  import type { Todo } from '../../shared/models'
  import { api } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { dueLabel } from '../lib/time'
  import Avatar from './ui/Avatar.svelte'
  import Checkbox from './ui/Checkbox.svelte'
  import Icon from './ui/Icon.svelte'

  let {
    todo,
    projectId,
    draggable = false,
    ondragstart,
    canComplete = true,
  }: { todo: Todo; projectId: number; draggable?: boolean; ondragstart?: (e: DragEvent) => void; canComplete?: boolean } = $props()

  let done = $state(!!todo.completedAt)
  $effect(() => {
    done = !!todo.completedAt
  })

  async function toggle(v: boolean) {
    done = v
    try {
      await api.post(`/projects/${projectId}/todos/${todo.id}/complete`, { done: v })
      router.reload()
    } catch {
      done = !v
    }
  }

  const due = $derived(dueLabel(todo.dueOn))
</script>

<div
  role="listitem"
  class={cn('group flex items-start gap-2.5 rounded-md py-1.5 pr-2 transition-colors hover:bg-muted/50', draggable && 'cursor-grab')}
  draggable={draggable ? 'true' : undefined}
  {ondragstart}
  data-todo-id={todo.id}
>
  {#if draggable}<Icon icon={icons.GripVertical} size={14} class="mt-1 -ml-1 text-muted-foreground/0 group-hover:text-muted-foreground/60" />{/if}
  <Checkbox checked={done} onchange={toggle} label={`Complete ${todo.title}`} disabled={!canComplete} class="mt-[3px]" />
  <div class="min-w-0 flex-1">
    <Link href={`/projects/${projectId}/todos/${todo.id}`} class={cn('text-[15px] leading-snug text-foreground hover:underline', done && 'text-muted-foreground line-through')}>{todo.title}</Link>
    <span class="ml-1.5 inline-flex flex-wrap items-center gap-1.5 align-middle text-xs text-muted-foreground">
      {#each todo.assignees as p (p.id)}
        <span class="inline-flex items-center gap-1"><Avatar person={p} size={16} />{p.name.split(' ')[0]}</span>
      {/each}
      {#if due && !done}
        <span class={cn('inline-flex items-center gap-1 rounded px-1', due.tone === 'overdue' && 'bg-destructive/10 font-semibold text-destructive', due.tone === 'today' && 'bg-ginger-soft font-semibold text-foreground')}>
          <Icon icon={icons.Calendar} size={12} />{due.text}
        </span>
      {/if}
      {#if todo.notes}<Icon icon={icons.FileText} size={12} label="Has notes" />{/if}
      {#if todo.subtaskCount}<span class="inline-flex items-center gap-0.5"><Icon icon={icons.ListChecks} size={12} />{todo.subtasksDone}/{todo.subtaskCount}</span>{/if}
      {#if todo.commentCount}<span class="inline-flex items-center gap-0.5 rounded-full bg-sky-600 px-1.5 font-bold text-white">{todo.commentCount}</span>{/if}
      {#if done && todo.completedBy}<span>· done by {todo.completedBy.name.split(' ')[0]}</span>{/if}
    </span>
  </div>
</div>
