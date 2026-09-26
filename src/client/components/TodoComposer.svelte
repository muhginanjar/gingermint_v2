<script lang="ts">
  /** Inline "Add a to-do" form: title, assignees, "when done notify", due date, notes. */
  import { router } from '@inertiajs/svelte'
  import type { Person } from '../../shared/models'
  import PeoplePicker from './PeoplePicker.svelte'
  import RichEditor from './RichEditor.svelte'
  import Button from './ui/Button.svelte'
  import Input from './ui/Input.svelte'

  let {
    projectId,
    listId = null,
    parentId = null,
    people,
    oncancel,
    label = 'Add this to-do',
  }: { projectId: number; listId?: number | null; parentId?: number | null; people: Person[]; oncancel: () => void; label?: string } = $props()

  let title = $state('')
  let assigneeIds = $state<number[]>([])
  let notifyIds = $state<number[]>([])
  let dueOn = $state('')
  let notes = $state('')
  let showMore = $state(false)
  let titleInput = $state<HTMLInputElement | null>(null)

  $effect(() => {
    titleInput?.focus()
  })

  function submit(e?: SubmitEvent) {
    e?.preventDefault()
    if (!title.trim()) return
    router.post(`/projects/${projectId}/todos`, { title, listId, parentId, assigneeIds, notifyIds, dueOn: dueOn || null, notes }, {
      preserveScroll: true,
      onSuccess: () => {
        title = ''
        notes = ''
        dueOn = ''
        assigneeIds = []
        notifyIds = []
        titleInput?.focus()
      },
    })
  }
</script>

<form onsubmit={submit} class="my-2 grid gap-2.5 rounded-lg border bg-muted/30 p-3" onkeydown={(e) => e.key === 'Escape' && oncancel()}>
  <Input bind:ref={titleInput} bind:value={title} placeholder="Describe this to-do…" aria-label="To-do" class="h-10 text-[15px]" />
  <div class="grid gap-2 sm:grid-cols-[1fr_170px]">
    <PeoplePicker {people} bind:selected={assigneeIds} placeholder="Assign to…" label="Assigned to" />
    <Input type="date" bind:value={dueOn} aria-label="Due on" />
  </div>
  {#if showMore}
    <PeoplePicker {people} bind:selected={notifyIds} placeholder="When done, notify…" label="When done, notify" />
    <RichEditor bind:value={notes} {people} {projectId} rows={3} minimal placeholder="Add extra details or attach a file…" label="Notes" />
  {:else}
    <button type="button" class="justify-self-start text-xs text-link hover:underline" onclick={() => (showMore = true)}>+ Notes & who to notify when done</button>
  {/if}
  <div class="flex gap-2">
    <Button type="submit" size="sm" disabled={!title.trim()}>{label}</Button>
    <Button size="sm" variant="ghost" onclick={oncancel}>Cancel</Button>
  </div>
</form>
