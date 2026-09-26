<script lang="ts">
  /** A document, file (with preview) or external link inside Docs & Files. */
  import { router } from '@inertiajs/svelte'
  import type { Comment, Person, ProjectRef, VaultItem } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import Textarea from '../../components/ui/Textarea.svelte'
  import { formatBytes, iconOf, linkService } from '../../lib/files'
  import * as icons from '../../lib/icons'
  import { formatDateTime } from '../../lib/time'

  let {
    project,
    item,
    trail,
    comments,
    subscribed,
    bookmarked,
    people,
    errors = {},
  }: {
    project: ProjectRef
    item: VaultItem
    trail: { id: number; title: string }[]
    comments: Comment[]
    subscribed: boolean
    bookmarked: boolean
    people: Person[]
    errors?: Record<string, string>
  } = $props()

  const isClient = $derived(project.myRole === 'client')
  const base = $derived(`/projects/${project.id}/docs`)
  const parent = $derived(trail.at(-1))
  let editOpen = $state(false)
  let form = $state({ title: '', description: '', url: '', imageUrl: '', clientVisible: false })

  function openEdit() {
    form = { title: item.title, description: item.description, url: item.url ?? '', imageUrl: item.imageUrl ?? '', clientVisible: item.clientVisible }
    editOpen = true
  }
  const save = () => router.patch(`${base}/${item.id}`, { ...form, body: item.body, color: item.color }, { preserveScroll: true, onSuccess: () => (editOpen = false) })
</script>

<ProjectShell {project} tool="docs" title={item.title} crumbs={[...trail.map((t) => ({ label: t.title, href: `${base}/folders/${t.id}` })), { label: item.title }]}>
  <article class="mx-auto max-w-3xl">
    <RecordBar backHref={parent ? `${base}/folders/${parent.id}` : base} backLabel={parent?.title ?? 'Docs & Files'} type={item.kind} id={item.id} title={item.title} context={project.name} {bookmarked} {subscribed}>
      {#snippet menu({ close })}
        {#if !isClient}
          {#if item.kind === 'doc'}
            <MenuItem href={`${base}/${item.id}/edit`} icon={icons.Pencil}>Edit document</MenuItem>
          {:else}
            <MenuItem icon={icons.Pencil} onclick={() => { close(); openEdit() }}>Rename & details</MenuItem>
          {/if}
          <MenuItem icon={item.clientVisible ? icons.EyeOff : icons.Eye} onclick={() => { close(); router.post(`${base}/visibility`, { ids: [item.id], visible: !item.clientVisible }, { preserveScroll: true }) }}>{item.clientVisible ? 'Hide from clients' : 'Show to clients'}</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this?') && router.delete(`${base}/${item.id}`) }}>Delete</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>

    {#if item.kind === 'doc'}
      <header class="text-center">
        <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{item.title}</h1>
        <p class="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
          <Avatar person={item.createdBy} size={22} /> {item.createdBy?.name ?? 'Someone'} · last updated {formatDateTime(item.updatedAt)}
        </p>
        {#if !isClient}<Button variant="outline" size="sm" class="mt-3" href={`${base}/${item.id}/edit`}><Icon icon={icons.Pencil} /> Edit</Button>{/if}
      </header>
      <RichText body={item.body} class="mt-8" />
    {:else if item.kind === 'link'}
      <a href={item.url ?? '#'} target="_blank" rel="noopener noreferrer" class="block overflow-hidden rounded-xl border bg-card no-underline shadow-sm transition-shadow hover:shadow-md">
        {#if item.imageUrl?.startsWith('/files/')}<img src={item.imageUrl} alt="" class="max-h-72 w-full object-cover" />{/if}
        <div class="p-5">
          <p class="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ginger"><Icon icon={icons.Link} size={13} /> {linkService(item.url)}</p>
          <h1 class="mt-1 text-2xl font-black text-foreground">{item.title}</h1>
          {#if item.description}<p class="mt-1 text-muted-foreground">{item.description}</p>{/if}
          <p class="mt-3 flex items-center gap-1 truncate text-sm text-link">{item.url} <Icon icon={icons.ExternalLink} size={13} /></p>
        </div>
      </a>
      <p class="mt-3 text-sm text-muted-foreground">Added by {item.createdBy?.name ?? 'someone'} · {formatDateTime(item.createdAt)}</p>
    {:else if item.attachment}
      <h1 class="flex items-center gap-2 text-2xl font-black tracking-tight"><Icon icon={iconOf(item)} size={24} class="text-muted-foreground" />{item.title}</h1>
      <p class="mt-1 text-sm text-muted-foreground">{formatBytes(item.attachment.size)} · {item.attachment.mime} · uploaded by {item.createdBy?.name ?? 'someone'} {formatDateTime(item.createdAt)}</p>
      <div class="mt-6 overflow-hidden rounded-xl border bg-muted/40">
        {#if item.attachment.kind === 'image'}
          <img src={item.attachment.url} alt={item.title} class="mx-auto max-h-[70vh] object-contain" />
        {:else if item.attachment.kind === 'voice'}
          <div class="p-6"><audio controls src={item.attachment.url} class="w-full"></audio></div>
        {:else if item.attachment.kind === 'video'}
          <video controls src={item.attachment.url} class="max-h-[70vh] w-full"><track kind="captions" /></video>
        {:else}
          <div class="flex flex-col items-center gap-2 p-10 text-center text-muted-foreground">
            <Icon icon={iconOf(item)} size={40} />
            <p>No preview for this file type.</p>
          </div>
        {/if}
      </div>
      <div class="mt-3 flex gap-2">
        <Button href={`${item.attachment.url}?download`} external><Icon icon={icons.Download} /> Download</Button>
        <Button variant="outline" href={item.attachment.url} external target="_blank"><Icon icon={icons.ExternalLink} /> Open in a new tab</Button>
      </div>
      {#if item.description}<p class="mt-4">{item.description}</p>{/if}
    {/if}

    <CommentThread type={item.kind} id={item.id} {comments} {people} projectId={project.id} />
  </article>
</ProjectShell>

<Dialog bind:open={editOpen} title={item.kind === 'link' ? 'Edit link' : 'Rename file'}>
  <div class="grid gap-4">
    <Field id="e-title" label="Title" error={errors.title}><Input id="e-title" bind:value={form.title} /></Field>
    {#if item.kind === 'link'}
      <Field id="e-url" label="Link" error={errors.url}><Input id="e-url" bind:value={form.url} /></Field>
      <Field id="e-img" label="Image" error={errors.imageUrl}><Input id="e-img" bind:value={form.imageUrl} /></Field>
    {/if}
    <Field id="e-desc" label="Description"><Textarea id="e-desc" bind:value={form.description} rows={2} /></Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={form.clientVisible} label="Visible to clients" /> The client sees this</label>
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (editOpen = false)}>Cancel</Button>
    <Button onclick={save}>Save</Button>
  {/snippet}
</Dialog>
