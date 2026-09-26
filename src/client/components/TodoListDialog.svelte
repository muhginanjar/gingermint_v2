<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { TodoList } from '../../shared/models'
  import Button from './ui/Button.svelte'
  import Dialog from './ui/Dialog.svelte'
  import Field from './ui/Field.svelte'
  import Input from './ui/Input.svelte'
  import Switch from './ui/Switch.svelte'
  import Textarea from './ui/Textarea.svelte'

  let { open = $bindable(false), projectId, list = null }: { open?: boolean; projectId: number; list?: TodoList | null } = $props()

  let name = $state('')
  let description = $state('')
  let clientVisible = $state(false)

  $effect(() => {
    if (open) {
      name = list?.name ?? ''
      description = list?.description ?? ''
      clientVisible = list?.clientVisible ?? false
    }
  })

  function save() {
    const data = { name, description, clientVisible }
    const opts = { preserveScroll: true, onSuccess: () => (open = false) }
    if (list) router.patch(`/projects/${projectId}/todos/lists/${list.id}`, data, opts)
    else router.post(`/projects/${projectId}/todos/lists`, data, opts)
  }
</script>

<Dialog bind:open title={list ? 'Edit list' : 'New to-do list'}>
  <div class="grid gap-4">
    <Field id="list-name" label="Name"><Input id="list-name" bind:value={name} placeholder="e.g. Launch checklist" onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && save()} /></Field>
    <Field id="list-desc" label="Details (optional)"><Textarea id="list-desc" bind:value={description} rows={2} /></Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={clientVisible} label="Visible to clients" /> The client sees this list</label>
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
    <Button onclick={save} disabled={!name.trim()}>{list ? 'Save' : 'Add this list'}</Button>
  {/snippet}
</Dialog>
