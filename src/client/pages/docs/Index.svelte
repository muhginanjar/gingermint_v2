<script lang="ts">
  /**
   * Docs & Files: documents, uploads, colored folders and cloud links.
   * Filter by All / Images / Docs / file type, sort, live filter, keep
   * folders open (tree view), multi-select to move / share with clients /
   * delete, and drop files anywhere to upload into the current folder.
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { ProjectRef, VaultItem } from '../../../shared/models'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Checkbox from '../../components/ui/Checkbox.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import EmptyState from '../../components/ui/EmptyState.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Popover from '../../components/ui/Popover.svelte'
  import Select from '../../components/ui/Select.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import Textarea from '../../components/ui/Textarea.svelte'
  import { uploadFiles } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import { formatBytes, GROUP_LABEL, groupOf, iconOf, linkService, type FileGroup } from '../../lib/files'
  import * as icons from '../../lib/icons'
  import { toast } from '../../lib/state.svelte'
  import { formatDate } from '../../lib/time'

  let {
    project,
    items,
    folder,
    trail,
    errors = {},
  }: { project: ProjectRef; items: VaultItem[]; folder: VaultItem | null; trail: { id: number; title: string }[]; errors?: Record<string, string> } = $props()

  const isClient = $derived(project.myRole === 'client')
  const folderId = $derived(folder?.id ?? null)
  const base = $derived(`/projects/${project.id}/docs`)

  let tab = $state('all')
  let type = $state<FileGroup | ''>('')
  let sort = $state('name')
  let filter = $state('')
  let keepOpen = $state(false)
  let selected = $state<number[]>([])
  let uploading = $state(0)
  let dragOver = $state(false)
  let fileInput = $state<HTMLInputElement | null>(null)
  let folderDialog = $state(false)
  let linkDialog = $state(false)
  let moveDialog = $state(false)
  let moveTarget = $state<string | number>('')
  let newFolder = $state({ title: '', color: 'blue', clientVisible: false })
  let link = $state({ url: '', title: '', description: '', imageUrl: '', clientVisible: false })
  let linkImageInput = $state<HTMLInputElement | null>(null)

  async function onLinkImage(e: Event) {
    const t = e.currentTarget as HTMLInputElement
    const file = t.files?.[0]
    t.value = ''
    if (!file) return
    const [saved] = await uploadFiles([file], project.id)
    if (saved) link.imageUrl = saved.url
  }

  $effect(() => {
    try {
      keepOpen = localStorage.getItem('gm:keep-folders-open') === '1'
    } catch {
      /* ignore */
    }
  })
  $effect(() => {
    try {
      localStorage.setItem('gm:keep-folders-open', keepOpen ? '1' : '0')
    } catch {
      /* ignore */
    }
  })

  const children = $derived.by(() => {
    const m = new Map<number | null, VaultItem[]>()
    for (const i of items) m.set(i.parentId, [...(m.get(i.parentId) ?? []), i])
    return m
  })

  function descendants(id: number | null): VaultItem[] {
    const out: VaultItem[] = []
    for (const c of children.get(id) ?? []) {
      out.push(c)
      if (c.kind === 'folder') out.push(...descendants(c.id))
    }
    return out
  }

  const countIn = (id: number) => (children.get(id) ?? []).length

  function passes(i: VaultItem): boolean {
    const g = groupOf(i)
    if (tab === 'images' && g !== 'image' && g !== 'folder') return false
    if (tab === 'docs' && i.kind !== 'doc' && g !== 'folder') return false
    if (type && g !== type && g !== 'folder') return false
    const q = filter.trim().toLowerCase()
    if (q && !`${i.title} ${i.description}`.toLowerCase().includes(q)) return false
    return true
  }

  function sorter(a: VaultItem, b: VaultItem): number {
    if (a.kind === 'folder' && b.kind !== 'folder') return -1
    if (b.kind === 'folder' && a.kind !== 'folder') return 1
    if (sort === 'newest') return b.updatedAt.localeCompare(a.updatedAt)
    if (sort === 'type') return groupOf(a).localeCompare(groupOf(b)) || a.title.localeCompare(b.title)
    return a.title.localeCompare(b.title, undefined, { sensitivity: 'base' })
  }

  const filtering = $derived(!!filter.trim() || tab !== 'all' || !!type)
  /** Rows with a depth: flat search results when filtering, a tree when keepOpen. */
  const rows = $derived.by(() => {
    if (filtering) return descendants(folderId).filter((i) => i.kind !== 'folder' && passes(i)).sort(sorter).map((i) => ({ item: i, depth: 0 }))
    const out: { item: VaultItem; depth: number }[] = []
    const walk = (id: number | null, depth: number) => {
      for (const i of [...(children.get(id) ?? [])].sort(sorter)) {
        out.push({ item: i, depth })
        if (keepOpen && i.kind === 'folder') walk(i.id, depth + 1)
      }
    }
    walk(folderId, 0)
    return out
  })

  const allFolders = $derived(items.filter((i) => i.kind === 'folder'))
  const toggleSel = (id: number, on: boolean) => (selected = on ? [...selected, id] : selected.filter((x) => x !== id))

  async function upload(files: File[]) {
    if (!files.length || isClient) return
    uploading += files.length
    try {
      const saved = await uploadFiles(files, project.id)
      router.post(base, { kind: 'file', parentId: folderId, files: saved.map((f) => ({ attachmentId: f.id, title: f.filename })) }, {
        preserveScroll: true,
        onSuccess: () => toast(saved.length === 1 ? 'File uploaded.' : `${saved.length} files uploaded.`),
      })
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      uploading = 0
    }
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    dragOver = false
    void upload([...(e.dataTransfer?.files ?? [])])
  }

  function createFolder() {
    router.post(base, { kind: 'folder', parentId: folderId, ...newFolder }, { preserveScroll: true, onSuccess: () => { folderDialog = false; newFolder = { title: '', color: 'blue', clientVisible: false } } })
  }
  function createLink() {
    router.post(base, { kind: 'link', parentId: folderId, ...link }, { preserveScroll: true, onSuccess: () => { linkDialog = false; link = { url: '', title: '', description: '', imageUrl: '', clientVisible: false } } })
  }
  function bulkMove() {
    router.post(`${base}/move`, { ids: selected, parentId: moveTarget === '' ? null : Number(moveTarget) }, { preserveScroll: true, onSuccess: () => { moveDialog = false; selected = [] } })
  }
  const bulkVisible = (visible: boolean) => router.post(`${base}/visibility`, { ids: selected, visible }, { preserveScroll: true, onSuccess: () => (selected = []) })
  const bulkDelete = () => confirm(`Delete ${selected.length} item(s)? Folders take their contents with them.`) && router.post(`${base}/delete`, { ids: selected }, { preserveScroll: true, onSuccess: () => (selected = []) })

  const typeOptions = (['pdf', 'image', 'audio', 'video', 'sheet', 'doc', 'link', 'other'] as FileGroup[]).map((g) => ({ value: g, label: GROUP_LABEL[g] }))
</script>

<ProjectShell {project} tool="docs" title={folder?.title ?? 'Docs & Files'} crumbs={trail.map((t, i) => ({ label: t.title, href: i < trail.length - 1 ? `${base}/folders/${t.id}` : undefined }))}>
  <div
    role="region"
    aria-label="Docs and files"
    ondragover={(e) => { if (!isClient && e.dataTransfer?.types.includes('Files')) { e.preventDefault(); dragOver = true } }}
    ondragleave={(e) => { if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) dragOver = false }}
    ondrop={onDrop}
    class={cn('relative rounded-lg', dragOver && 'outline-dashed outline-2 outline-offset-8 outline-primary')}
  >
    {#if trail.length}
      <nav class="mb-2 flex flex-wrap items-center gap-1 text-sm" aria-label="Folder path">
        <Link href={base} class="text-link hover:underline">Docs & Files</Link>
        {#each trail as t, i (t.id)}
          <Icon icon={icons.ChevronRight} size={13} class="text-muted-foreground" />
          {#if i < trail.length - 1}<Link href={`${base}/folders/${t.id}`} class="text-link hover:underline">{t.title}</Link>{:else}<span class="text-muted-foreground">{t.title}</span>{/if}
        {/each}
      </nav>
    {/if}
    <h1 class="flex items-center gap-2 text-[34px] font-black tracking-tight">
      {#if folder}<Icon icon={icons.FolderOpen} size={28} class={cn('rounded-md p-1 text-white', colorOf(folder.color).strong)} />{/if}
      {folder?.title ?? 'Docs & Files'}
    </h1>

    <div class="mt-4 flex flex-wrap items-center gap-2">
      {#if !isClient}
        <Popover contentClass="w-60">
          {#snippet trigger({ toggle })}
            <Button size="sm" onclick={toggle}><Icon icon={icons.Plus} /> New…</Button>
          {/snippet}
          {#snippet children({ close })}
            <MenuItem href={`${base}/new${folderId ? `?parent=${folderId}` : ''}`} icon={icons.FileText}>Document</MenuItem>
            <MenuItem icon={icons.FolderPlus} onclick={() => { close(); folderDialog = true }}>Folder</MenuItem>
            <MenuItem icon={icons.Upload} onclick={() => { close(); fileInput?.click() }}>Upload files</MenuItem>
            <MenuItem icon={icons.Link} onclick={() => { close(); linkDialog = true }}>Link to Figma, Google Docs, Dropbox…</MenuItem>
          {/snippet}
        </Popover>
        <input bind:this={fileInput} type="file" multiple class="hidden" onchange={(e) => { const t = e.currentTarget as HTMLInputElement; void upload([...(t.files ?? [])]); t.value = '' }} />
      {/if}
      <Tabs items={[{ value: 'all', label: 'All files' }, { value: 'images', label: 'Images' }, { value: 'docs', label: 'Docs' }]} bind:value={tab} label="Show" />
      <Select bind:value={type} options={[{ value: '', label: 'File type' }, ...typeOptions]} class="h-8 w-36" aria-label="File type" />
      <Select bind:value={sort} options={[{ value: 'name', label: 'Sort by name' }, { value: 'newest', label: 'Newest first' }, { value: 'type', label: 'Sort by type' }]} class="h-8 w-36" aria-label="Sort" />
      <label class="relative">
        <input bind:value={filter} placeholder="Filter…" aria-label="Filter files" class="h-8 w-40 rounded-md border border-input bg-card px-3 pr-7 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
        {#if filter}<button type="button" class="absolute right-1.5 top-1.5 text-muted-foreground" aria-label="Clear filter" onclick={() => (filter = '')}><Icon icon={icons.X} size={14} /></button>{/if}
      </label>
      <label class="flex items-center gap-2 text-sm text-muted-foreground"><Switch bind:checked={keepOpen} label="Keep folders open" /> Keep folders open</label>
      {#if uploading}<span class="text-sm text-muted-foreground">Uploading {uploading}…</span>{/if}
    </div>

    {#if selected.length && !isClient}
      <div class="sticky top-16 z-10 mt-3 flex flex-wrap items-center gap-2 rounded-md border bg-foreground px-3 py-2 text-sm text-background shadow-lg">
        <span class="font-semibold">{selected.length} selected</span>
        <Button size="xs" variant="secondary" onclick={() => { moveTarget = ''; moveDialog = true }}><Icon icon={icons.Folder} /> Move</Button>
        <Button size="xs" variant="secondary" onclick={() => bulkVisible(true)}><Icon icon={icons.Eye} /> Show to client</Button>
        <Button size="xs" variant="secondary" onclick={() => bulkVisible(false)}><Icon icon={icons.EyeOff} /> Hide from client</Button>
        <Button size="xs" variant="destructive" onclick={bulkDelete}><Icon icon={icons.Trash} /> Delete</Button>
        <button type="button" class="ml-auto text-xs underline opacity-80" onclick={() => (selected = [])}>Clear</button>
      </div>
    {/if}

    <ul class="mt-4 divide-y border-y">
      {#each rows as { item: i, depth } (i.id)}
        {@const href = i.kind === 'folder' ? `${base}/folders/${i.id}` : `${base}/${i.id}`}
        <li class={cn('group flex items-center gap-3 py-3', selected.includes(i.id) && 'bg-accent/50')} style={`padding-left:${depth * 28}px`}>
          {#if !isClient}
            <Checkbox square checked={selected.includes(i.id)} onchange={(v) => toggleSel(i.id, v)} label={`Select ${i.title}`} class={cn('opacity-0 group-hover:opacity-100 focus-visible:opacity-100', selected.length && 'opacity-100')} />
          {/if}
          {#if i.kind === 'folder'}
            <span class={cn('h-2 w-2 shrink-0 rounded-full', colorOf(i.color).dot)}></span>
            <Link {href} class={cn('flex h-11 w-14 shrink-0 items-center justify-center rounded-md text-white/80', colorOf(i.color).strong)} aria-label={`Open ${i.title}`}><Icon icon={icons.Plus} size={16} /></Link>
          {:else if i.attachment?.kind === 'image'}
            <span class="w-2"></span>
            <Link {href} class="h-11 w-14 shrink-0 overflow-hidden rounded-md border bg-muted"><img src={i.attachment.url} alt="" loading="lazy" class="h-full w-full object-cover" /></Link>
          {:else}
            <span class="w-2"></span>
            <Link {href} class="flex h-11 w-14 shrink-0 items-center justify-center rounded-md border bg-muted/60 text-muted-foreground"><Icon icon={iconOf(i)} size={20} /></Link>
          {/if}
          <div class="min-w-0 flex-1">
            <p class="flex flex-wrap items-center gap-2">
              <Link {href} class="font-bold text-foreground hover:underline">{i.title}</Link>
              {#if i.clientVisible && !isClient}<span class="inline-flex items-center gap-1 rounded-full bg-amber-300 px-2 py-0.5 text-[11px] font-semibold text-amber-950"><Icon icon={icons.Eye} size={11} />The client sees this</span>{/if}
            </p>
            <p class="truncate text-[13px] text-muted-foreground">
              {#if i.kind === 'folder'}{countIn(i.id)} {countIn(i.id) === 1 ? 'item' : 'items'}
              {:else if i.kind === 'link'}{linkService(i.url)} · {i.description || i.url}
              {:else if i.kind === 'file'}{i.attachment ? formatBytes(i.attachment.size) : ''} · {i.createdBy?.name ?? ''} · {formatDate(i.updatedAt)}
              {:else}Document by {i.createdBy?.name ?? 'someone'} · updated {formatDate(i.updatedAt)}{/if}
              {#if i.commentCount} · {i.commentCount} comments{/if}
            </p>
          </div>
          {#if i.kind === 'link' && i.url}
            <a href={i.url} target="_blank" rel="noopener noreferrer" class="hidden shrink-0 items-center gap-1 text-xs text-link hover:underline sm:flex">Open <Icon icon={icons.ExternalLink} size={12} /></a>
          {/if}
          {#if i.kind === 'file' && i.attachment}
            <a href={`${i.attachment.url}?download`} class="hidden shrink-0 rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground sm:block" aria-label={`Download ${i.title}`}><Icon icon={icons.Download} size={15} /></a>
          {/if}
        </li>
      {/each}
    </ul>
    {#if !rows.length}
      <div class="mt-6">
        <EmptyState icon={icons.Folder} title={filtering ? 'Nothing matches' : 'Nothing here yet'}>
          {filtering ? 'Try a different filter.' : 'Write a doc, make a folder, add a Figma or Google Docs link — or drop files anywhere on this page.'}
        </EmptyState>
      </div>
    {/if}
  </div>
</ProjectShell>

<Dialog bind:open={folderDialog} title="New folder">
  <div class="grid gap-4">
    <Field id="f-name" label="Name" error={errors.title}><Input id="f-name" bind:value={newFolder.title} placeholder="e.g. Final Designs" /></Field>
    <Field label="Color"><ColorPicker bind:value={newFolder.color} /></Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={newFolder.clientVisible} label="Visible to clients" /> The client sees this folder</label>
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (folderDialog = false)}>Cancel</Button>
    <Button onclick={createFolder} disabled={!newFolder.title.trim()}>Make folder</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={linkDialog} title="Add an external link" description="Keep Figma files, Google Docs, Dropbox folders and other cloud links with the project.">
  <div class="grid gap-4">
    <Field id="l-url" label="Link" error={errors.url}><Input id="l-url" bind:value={link.url} placeholder="https://www.figma.com/file/…" /></Field>
    <Field id="l-title" label="Title" error={errors.title}><Input id="l-title" bind:value={link.title} placeholder="Logo explorations" /></Field>
    <Field id="l-desc" label="Description"><Textarea id="l-desc" bind:value={link.description} rows={2} /></Field>
    <Field label="Preview image (optional)" error={errors.imageUrl}>
      <div class="flex items-center gap-3">
        {#if link.imageUrl}<img src={link.imageUrl} alt="" class="h-12 w-20 rounded border object-cover" />{/if}
        <Button variant="outline" size="sm" onclick={() => linkImageInput?.click()}><Icon icon={icons.Image} /> {link.imageUrl ? 'Change image' : 'Upload an image'}</Button>
        {#if link.imageUrl}<button type="button" class="text-xs text-muted-foreground underline" onclick={() => (link.imageUrl = '')}>Remove</button>{/if}
      </div>
      <input bind:this={linkImageInput} type="file" accept="image/*" class="hidden" onchange={onLinkImage} />
    </Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={link.clientVisible} label="Visible to clients" /> The client sees this</label>
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (linkDialog = false)}>Cancel</Button>
    <Button onclick={createLink} disabled={!link.url.trim() || !link.title.trim()}>Add link</Button>
  {/snippet}
</Dialog>

<Dialog bind:open={moveDialog} title={`Move ${selected.length} item(s)`}>
  <Field id="move-to" label="Move into">
    <Select id="move-to" bind:value={moveTarget} options={[{ value: '', label: 'Docs & Files (top level)' }, ...allFolders.filter((f) => !selected.includes(f.id)).map((f) => ({ value: f.id, label: f.title }))]} />
  </Field>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (moveDialog = false)}>Cancel</Button>
    <Button onclick={bulkMove}>Move</Button>
  {/snippet}
</Dialog>
