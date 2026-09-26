<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Message, Person, ProjectRef } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Switch from '../../components/ui/Switch.svelte'

  let {
    project,
    message,
    categories,
    people,
    errors = {},
  }: { project: ProjectRef; message: Message | null; categories: string[]; people: Person[]; errors?: Record<string, string> } = $props()

  let form = $state({
    title: message?.title ?? '',
    body: message?.body ?? '',
    category: message?.category ?? '',
    clientVisible: message?.clientVisible ?? false,
  })
  let busy = $state(false)
  const hasClients = $derived(true)

  function submit(e?: SubmitEvent) {
    e?.preventDefault()
    busy = true
    const opts = { onFinish: () => (busy = false) }
    if (message) router.patch(`/projects/${project.id}/messages/${message.id}`, form, opts)
    else router.post(`/projects/${project.id}/messages`, form, opts)
  }
</script>

<ProjectShell {project} tool="message_board" title={message ? 'Edit message' : 'New message'} crumbs={[{ label: message ? 'Edit' : 'New message' }]}>
  <form onsubmit={submit} class="mx-auto grid max-w-3xl gap-5">
    <div class="sticky top-14 z-20 -mx-4 flex items-center justify-between gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur sm:-mx-10 sm:px-10">
      <p class="text-sm font-semibold">{message ? 'Editing message' : 'New message'}</p>
      <div class="flex gap-2">
        <Button variant="ghost" size="sm" href={message ? `/projects/${project.id}/messages/${message.id}` : `/projects/${project.id}/messages`}>Cancel</Button>
        <Button type="submit" size="sm" disabled={busy || !form.title.trim()}>{message ? 'Save changes' : 'Post this message'}</Button>
      </div>
    </div>
    <Field id="m-title" error={errors.title}>
      <Input id="m-title" bind:value={form.title} placeholder="Type a title…" class="h-12 border-0 px-0 text-2xl font-black shadow-none focus-visible:ring-0" aria-label="Title" />
    </Field>
    <div class="flex flex-wrap items-center gap-3">
      <Field id="m-cat" label="Category (optional)" class="w-56">
        <Input id="m-cat" bind:value={form.category} list="message-categories" placeholder="e.g. Announcement" />
      </Field>
      <datalist id="message-categories">{#each [...new Set(['Announcement', 'FYI', 'Heartbeat', 'Pitch', 'Question', ...categories])] as c (c)}<option value={c}></option>{/each}</datalist>
      {#if hasClients}
        <label class="mt-5 flex items-center gap-2 text-sm">
          <Switch bind:checked={form.clientVisible} label="Visible to clients" /> The client sees this
        </label>
      {/if}
    </div>
    <Field error={errors.body}>
      <RichEditor bind:value={form.body} {people} projectId={project.id} rows={14} placeholder="Write away… (Markdown, @mentions, files and voice notes all work)" onsubmit={() => submit()} />
    </Field>
  </form>
</ProjectShell>
