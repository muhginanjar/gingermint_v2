<script lang="ts">
  /** Document editor: title + rich text with a sticky Save bar (no scrolling back up to save). */
  import { router } from '@inertiajs/svelte'
  import type { Person, ProjectRef, VaultItem } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Switch from '../../components/ui/Switch.svelte'

  let {
    project,
    item,
    parentId,
    people,
    errors = {},
  }: { project: ProjectRef; item: VaultItem | null; parentId: number | null; people: Person[]; errors?: Record<string, string> } = $props()

  const base = $derived(`/projects/${project.id}/docs`)
  let title = $state(item?.title ?? '')
  let body = $state(item?.body ?? '')
  let clientVisible = $state(item?.clientVisible ?? false)
  let busy = $state(false)
  let dirty = $state(false)

  $effect(() => {
    if (!dirty) return
    const warn = (e: BeforeUnloadEvent) => e.preventDefault()
    window.addEventListener('beforeunload', warn)
    return () => window.removeEventListener('beforeunload', warn)
  })

  function save(e?: SubmitEvent) {
    e?.preventDefault()
    busy = true
    dirty = false
    const opts = { onFinish: () => (busy = false) }
    if (item) router.patch(`${base}/${item.id}`, { title, body, clientVisible, color: item.color, description: item.description, redirect: 'show' }, opts)
    else router.post(base, { kind: 'doc', parentId, title, body, clientVisible }, opts)
  }
</script>

<ProjectShell {project} tool="docs" title={item ? `Editing ${item.title}` : 'New document'} crumbs={[{ label: item ? 'Edit document' : 'New document' }]}>
  <form onsubmit={save} oninput={() => (dirty = true)} class="mx-auto grid max-w-3xl gap-4">
    <div class="sticky top-14 z-20 -mx-4 flex items-center gap-2 border-b bg-card/95 px-4 py-2 backdrop-blur sm:-mx-10 sm:px-10">
      <p class="text-sm font-semibold">{item ? 'Editing document' : 'New document'}{#if dirty}<span class="ml-2 text-xs font-normal text-muted-foreground">Unsaved changes</span>{/if}</p>
      <label class="ml-auto hidden items-center gap-2 text-sm sm:flex"><Switch bind:checked={clientVisible} label="Visible to clients" /> Client sees this</label>
      <Button variant="ghost" size="sm" href={item ? `${base}/${item.id}` : base}>Cancel</Button>
      <Button type="submit" size="sm" disabled={busy || !title.trim()}>{busy ? 'Saving…' : 'Save'}</Button>
    </div>
    <Field error={errors.title}>
      <input bind:value={title} placeholder="Title this document…" aria-label="Title" class="w-full bg-transparent text-3xl font-black tracking-tight outline-none placeholder:text-muted-foreground" />
    </Field>
    <RichEditor bind:value={body} {people} projectId={project.id} rows={24} placeholder="Start writing… Headings, tables, code blocks and Markdown pasted from anywhere all work." onsubmit={() => save()} />
  </form>
</ProjectShell>
