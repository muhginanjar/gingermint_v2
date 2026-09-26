<script lang="ts">
  /**
   * The project page: identity + status at a glance, latest activity on top,
   * then the toolbox (live previews) with "Add a tool". Tools can be renamed,
   * removed, and dragged into a new order.
   */
  import { Link, router } from '@inertiajs/svelte'
  import type { Activity, Folder, ProjectDetail, ToolKind } from '../../../shared/models'
  import { TOOL_KINDS } from '../../../shared/models'
  import ActivityItem from '../../components/ActivityItem.svelte'
  import ProjectMark from '../../components/ProjectMark.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import ToolPreview from '../../components/ToolPreview.svelte'
  import AvatarStack from '../../components/ui/AvatarStack.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Popover from '../../components/ui/Popover.svelte'
  import { api } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { toast } from '../../lib/state.svelte'
  import { formatDate } from '../../lib/time'
  import { TOOL_BLURB, toolHref, toolIcon } from '../../lib/tools'
  import { buttonVariants } from '../../lib/variants'

  let {
    project,
    previews,
    activity,
    bookmarked,
    canDelete,
  }: { project: ProjectDetail; previews: Record<string, unknown>; activity: Activity[]; folders: Folder[]; bookmarked: boolean; canDelete: boolean } = $props()

  const isClient = $derived(project.myRole === 'client')
  const missing = $derived(TOOL_KINDS.filter((k) => !project.tools.some((t) => t.kind === k)))
  let order = $state(project.tools.map((t) => t.id))
  let dragging = $state<number | null>(null)
  let renameTool = $state<{ id: number; name: string } | null>(null)
  let isBookmarked = $state(bookmarked)

  $effect(() => {
    order = project.tools.map((t) => t.id)
  })

  const ordered = $derived(order.map((id) => project.tools.find((t) => t.id === id)).filter((t) => !!t))

  const STATUS = {
    on_track: { label: 'On track', cls: 'bg-green-100 text-green-900 dark:bg-green-900/40 dark:text-green-200' },
    at_risk: { label: 'At risk', cls: 'bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-200' },
    off_track: { label: 'Off track', cls: 'bg-red-100 text-red-900 dark:bg-red-900/40 dark:text-red-200' },
    done: { label: 'Done', cls: 'bg-sky-100 text-sky-900 dark:bg-sky-900/40 dark:text-sky-200' },
  }

  function onDragOver(e: DragEvent, overId: number) {
    e.preventDefault()
    if (dragging === null || dragging === overId) return
    const next = order.filter((id) => id !== dragging)
    next.splice(next.indexOf(overId), 0, dragging)
    order = next
  }

  function onDrop() {
    dragging = null
    router.post(`/projects/${project.id}/tools/reorder`, { ids: order }, { preserveScroll: true })
  }

  const addTool = (kind: ToolKind) => router.post(`/projects/${project.id}/tools`, { kind }, { preserveScroll: true })

  async function toggleBookmark() {
    const res = await api.post<{ bookmarked: boolean }>('/my/bookmarks', { url: `/projects/${project.id}`, title: project.name, kind: 'project', context: 'Project' })
    isBookmarked = res.bookmarked
    toast(res.bookmarked ? 'Bookmarked.' : 'Bookmark removed.')
  }

  function destroy() {
    const typed = prompt(`This permanently deletes “${project.name}” and everything in it. Type the project name to confirm.`)
    if (typed === project.name) router.delete(`/projects/${project.id}`)
  }
</script>

<ProjectShell {project} title={project.name} wide sheet={false}>
  <section class="rounded-xl border bg-card px-4 py-6 shadow-sheet sm:px-10">
    <div class="flex flex-wrap items-center gap-2">
      <Link href={`/projects/${project.id}/people`} class="flex items-center gap-2 rounded-full py-1 pl-1 pr-3 hover:bg-muted">
        <AvatarStack people={project.people} size={26} max={10} />
        {#if !isClient}<span class="rounded-full bg-accent px-2.5 py-0.5 text-[13px] font-semibold text-accent-foreground">Invite people</span>{/if}
      </Link>
      <div class="ml-auto flex items-center gap-1">
        <button type="button" class={buttonVariants({ variant: 'ghost', size: 'sm' })} onclick={toggleBookmark} aria-pressed={isBookmarked}>
          <Icon icon={isBookmarked ? icons.BookmarkCheck : icons.Bookmark} /> <span class="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
        </button>
        <button type="button" class={buttonVariants({ variant: 'ghost', size: 'sm' })} onclick={() => router.post(`/projects/${project.id}/notify`, { on: !project.notify }, { preserveScroll: true })}>
          <Icon icon={project.notify ? icons.Bell : icons.BellOff} /> <span class="hidden sm:inline">Notifications {project.notify ? 'on' : 'off'}</span>
        </button>
        {#if !isClient}
          <Popover align="end" contentClass="w-60">
            {#snippet trigger({ toggle })}
              <button type="button" class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} onclick={toggle} aria-label="Project options"><Icon icon={icons.Ellipsis} /></button>
            {/snippet}
            {#snippet children({ close })}
              <MenuItem href={`/projects/${project.id}/edit`} icon={icons.Pencil} onclick={close}>Edit name, dates & details</MenuItem>
              <MenuItem href={`/projects/${project.id}/people`} icon={icons.Users} onclick={close}>People & client access</MenuItem>
              <MenuItem href={`/projects/${project.id}/integrations`} icon={icons.Webhook} onclick={close}>Integrations & email-in</MenuItem>
              <MenuItem icon={icons.Copy} onclick={() => { close(); router.post(`/projects/${project.id}/template`) }}>{project.isTemplate ? 'Duplicate template' : 'Save as a template'}</MenuItem>
              <div class="my-1 h-px bg-border"></div>
              {#if project.archivedAt}
                <MenuItem icon={icons.ArchiveRestore} onclick={() => router.post(`/projects/${project.id}/archive`, { archived: false })}>Unarchive</MenuItem>
              {:else}
                <MenuItem icon={icons.Archive} onclick={() => confirm('Archive this project? It moves out of Home but nothing is lost.') && router.post(`/projects/${project.id}/archive`, { archived: true })}>Archive</MenuItem>
              {/if}
              {#if canDelete}<MenuItem icon={icons.Trash} danger onclick={() => { close(); destroy() }}>Delete project…</MenuItem>{/if}
            {/snippet}
          </Popover>
        {/if}
      </div>
    </div>

    <div class="mt-4 flex flex-col items-center text-center">
      <ProjectMark {project} size={52} />
      <h1 class="mt-3 flex items-center gap-2 text-3xl font-black tracking-tight sm:text-[40px]">
        {project.name}
        <button type="button" onclick={() => router.post(`/projects/${project.id}/star`, { starred: !project.starred }, { preserveScroll: true })} class={cn('rounded p-1', project.starred ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-500')} aria-label={project.starred ? 'Unstar' : 'Star'} aria-pressed={project.starred}>
          <Icon icon={icons.Star} size={22} class={project.starred ? 'fill-current' : ''} />
        </button>
      </h1>
      {#if project.isTemplate}<span class="mt-1 rounded bg-violet-100 px-2 py-0.5 text-xs font-semibold text-violet-900 dark:bg-violet-900/40 dark:text-violet-200">Template</span>{/if}
      {#if project.archivedAt}<span class="mt-1 rounded bg-muted px-2 py-0.5 text-xs font-semibold">Archived</span>{/if}
      {#if project.description}<p class="mt-2 max-w-2xl text-muted-foreground">{project.description}</p>{/if}
      <dl class="mt-4 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-sm">
        {#if project.lead}
          <div class="flex items-center gap-1.5"><dt class="text-muted-foreground">Lead</dt><dd class="flex items-center gap-1 font-medium"><Avatar person={project.lead} size={20} />{project.lead.name}</dd></div>
        {/if}
        {#if project.phase}<div class="flex items-center gap-1.5"><dt class="text-muted-foreground">Phase</dt><dd class="font-medium">{project.phase}</dd></div>{/if}
        {#if project.startOn || project.endOn}
          <div class="flex items-center gap-1.5"><dt><Icon icon={icons.CalendarDays} class="text-muted-foreground" /></dt><dd class="font-medium">{project.startOn ? formatDate(project.startOn) : '…'} – {project.endOn ? formatDate(project.endOn) : '…'}</dd></div>
        {/if}
        <div><dt class="sr-only">Status</dt><dd class={cn('rounded-full px-2.5 py-0.5 text-xs font-bold', STATUS[project.status].cls)}>{STATUS[project.status].label}</dd></div>
        {#if !isClient && !project.lead && !project.startOn}
          <Link href={`/projects/${project.id}/edit`} class="text-xs text-link underline">Add a lead, phase or dates</Link>
        {/if}
      </dl>
    </div>

    {#if activity.length}
      <section class="mx-auto mt-8 max-w-3xl rounded-lg border bg-muted/30 p-4" aria-label="Latest activity">
        <div class="mb-3 flex items-center justify-between">
          <h2 class="text-sm font-bold">Latest activity</h2>
          <Link href={`/activity?project=${project.id}`} class="text-xs text-link underline">See all</Link>
        </div>
        <ul class="grid gap-2.5">
          {#each activity as a (a.id)}<li><ActivityItem activity={a} showProject={false} /></li>{/each}
        </ul>
      </section>
    {/if}
  </section>

  <section class="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3" aria-label="Tools">
    {#each ordered as tool (tool.id)}
      <article
        draggable={!isClient}
        ondragstart={() => (dragging = tool.id)}
        ondragover={(e) => onDragOver(e, tool.id)}
        ondrop={onDrop}
        ondragend={onDrop}
        class={cn('group flex min-h-[220px] flex-col rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md', dragging === tool.id && 'opacity-50')}
      >
        <header class="flex items-center gap-2 px-4 pt-4">
          <Link href={toolHref(project.id, tool.kind)} class="flex min-w-0 flex-1 items-center gap-2 text-[15px] font-black text-ginger hover:underline">
            <Icon icon={toolIcon(tool.kind)} size={16} />
            <span class="truncate">{tool.name}</span>
          </Link>
          {#if !isClient}
            <span class="opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
              <Popover align="end" contentClass="w-44">
                {#snippet trigger({ toggle })}
                  <button type="button" onclick={toggle} class="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`${tool.name} options`}><Icon icon={icons.Ellipsis} size={14} /></button>
                {/snippet}
                {#snippet children({ close })}
                  <MenuItem icon={icons.Pencil} onclick={() => { close(); renameTool = { id: tool.id, name: tool.name } }}>Rename</MenuItem>
                  <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm(`Remove ${tool.name} from this project? Its content stays saved and comes back if you re-add the tool.`) && router.delete(`/projects/${project.id}/tools/${tool.id}`, { preserveScroll: true }) }}>Remove tool</MenuItem>
                {/snippet}
              </Popover>
            </span>
          {/if}
        </header>
        <Link href={toolHref(project.id, tool.kind)} class="block flex-1 px-4 pb-4 pt-2 text-foreground no-underline" aria-label={`Open ${tool.name}`}>
          <ToolPreview kind={tool.kind} data={previews[tool.kind]} />
        </Link>
      </article>
    {/each}

    {#if !isClient && missing.length}
      <article class="flex min-h-[220px] flex-col rounded-xl border border-dashed bg-card/60 p-4">
        <h2 class="mb-2 text-xs font-black uppercase tracking-wide text-ginger">Add a tool</h2>
        <ul class="grid gap-1">
          {#each missing as kind (kind)}
            <li>
              <button type="button" onclick={() => addTool(kind)} class="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left hover:bg-muted">
                <span class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-foreground text-background"><Icon icon={toolIcon(kind)} size={15} /></span>
                <span class="min-w-0">
                  <span class="block text-sm font-semibold">{TOOL_BLURB[kind].name}</span>
                  <span class="block truncate text-xs text-muted-foreground">{TOOL_BLURB[kind].blurb}</span>
                </span>
              </button>
            </li>
          {/each}
        </ul>
      </article>
    {/if}
  </section>

  {#if !isClient}
    <p class="mt-6 text-center text-xs text-muted-foreground">
      Email-in address for this project: <code class="rounded bg-card px-1.5 py-0.5">{project.inboundEmail}</code> — forwarded emails appear in Everything.
    </p>
  {/if}
</ProjectShell>

<Dialog open={renameTool !== null} title="Rename tool" onclose={() => (renameTool = null)}>
  {#if renameTool}
    <Input bind:value={renameTool.name} aria-label="Tool name" onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && renameTool && router.patch(`/projects/${project.id}/tools/${renameTool.id}`, { name: renameTool.name }, { preserveScroll: true, onSuccess: () => (renameTool = null) })} />
  {/if}
  {#snippet footer()}
    <Button variant="outline" onclick={() => (renameTool = null)}>Cancel</Button>
    <Button onclick={() => renameTool && router.patch(`/projects/${project.id}/tools/${renameTool.id}`, { name: renameTool.name }, { preserveScroll: true, onSuccess: () => (renameTool = null) })}>Save</Button>
  {/snippet}
</Dialog>
