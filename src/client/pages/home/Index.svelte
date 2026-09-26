<script lang="ts">
  /**
   * Home: an operational dashboard, not a launchpad. Left: greeting + account
   * actions. Center: folders and project cards. Right: most recent activity
   * and who's been active.
   */
  import { Link, router, usePage } from '@inertiajs/svelte'
  import type { Activity, ChromeProps, Folder, Person, ProjectSummary } from '../../../shared/models'
  import type { SharedPageProps } from '../../../shared/types'
  import AppShell from '../../components/AppShell.svelte'
  import ActivityItem from '../../components/ActivityItem.svelte'
  import Brand from '../../components/Brand.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import ProjectMark from '../../components/ProjectMark.svelte'
  import AvatarStack from '../../components/ui/AvatarStack.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Kbd from '../../components/ui/Kbd.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import MenuLabel from '../../components/ui/MenuLabel.svelte'
  import Popover from '../../components/ui/Popover.svelte'
  import Select from '../../components/ui/Select.svelte'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'
  import { greeting } from '../../lib/time'

  let {
    projects,
    folders,
    recent,
    active,
    isAdmin,
    chrome,
    errors = {},
  }: {
    projects: ProjectSummary[]
    folders: Folder[]
    recent: Activity[]
    active: Person[]
    isAdmin: boolean
    errors?: Record<string, string>
    chrome: ChromeProps
  } = $props()

  const page = usePage<SharedPageProps>()
  const user = $derived(page.props.auth.user)
  const firstName = $derived(user?.name.split(' ')[0] ?? '')

  let folderId = $state<number | null>(null)
  let filter = $state('')
  let folderDialog = $state(false)
  let folderName = $state('')
  let folderColor = $state('blue')
  let inviteDialog = $state(false)
  let invite = $state({ name: '', email: '', role: 'member' })
  let dragging = $state<number | null>(null)
  let dropTarget = $state<number | null>(null)

  const currentFolder = $derived(folders.find((f) => f.id === folderId) ?? null)
  const shown = $derived(
    projects
      .filter((p) => (folderId ? p.folderId === folderId : filter.trim() ? true : !p.folderId || p.starred))
      .filter((p) => !filter.trim() || `${p.name} ${p.description}`.toLowerCase().includes(filter.trim().toLowerCase())),
  )

  function addFolder() {
    router.post('/folders', { name: folderName, color: folderColor }, {
      onSuccess: () => {
        folderDialog = false
        folderName = ''
      },
    })
  }

  function sendInvite() {
    router.post('/adminland/people', invite, {
      onSuccess: () => {
        inviteDialog = false
        invite = { name: '', email: '', role: 'member' }
      },
    })
  }

  const star = (p: ProjectSummary) => router.post(`/projects/${p.id}/star`, { starred: !p.starred }, { preserveScroll: true })
  const moveTo = (p: ProjectSummary, fid: number | null) => router.post(`/projects/${p.id}/folder`, { folderId: fid }, { preserveScroll: true })

  function onDrop(fid: number) {
    const p = projects.find((x) => x.id === dragging)
    if (p && p.folderId !== fid) moveTo(p, fid)
    dragging = null
    dropTarget = null
  }

  function deleteFolder(f: Folder) {
    if (!confirm(`Remove the “${f.name}” folder? Its projects stay on Home.`)) return
    router.delete(`/folders/${f.id}`, { onSuccess: () => (folderId = null) })
  }
</script>

<AppShell tint="home" title="Home" wide>
  <div class="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)_280px] xl:grid-cols-[240px_minmax(0,620px)_300px] xl:justify-center">
    <!-- Left: greeting + account actions -->
    <aside class="flex flex-col gap-2 lg:items-end lg:pt-24 lg:text-right">
      <h1 class="text-xl font-black tracking-tight">{greeting()}, {firstName}</h1>
      <div class="flex flex-wrap gap-2 lg:flex-col lg:items-end">
        {#if chrome.accountRole !== 'client'}
          <Button variant="outline" size="sm" href="/projects/new"><Icon icon={icons.Plus} /> Make a new project</Button>
          <Button variant="outline" size="sm" onclick={() => (folderDialog = true)}><Icon icon={icons.FolderPlus} /> Add a folder</Button>
        {/if}
        {#if isAdmin}
          <Button variant="outline" size="sm" onclick={() => (inviteDialog = true)}><Icon icon={icons.UserPlus} /> Invite people to this workspace</Button>
          <Button variant="outline" size="sm" href="/adminland"><Icon icon={icons.KeyRound} /> Adminland</Button>
        {/if}
        {#if chrome.workspaces.length > 1}
          <Button variant="ghost" size="sm" href="/workspaces"><Icon icon={icons.LayoutGrid} /> Switch workspace</Button>
        {/if}
      </div>
    </aside>

    <!-- Center: the projects panel -->
    <section class="rounded-2xl border border-black/5 bg-card/70 p-4 shadow-sm backdrop-blur sm:p-6 dark:border-white/5" aria-label="Projects">
      <div class="mb-5 flex flex-col items-center gap-2 text-center">
        {#if chrome.accountLogo}
          <img src={chrome.accountLogo} alt={chrome.accountName} class="h-11 w-11 rounded-xl object-cover" />
        {:else}
          <Brand size={44} />
        {/if}
        <p class="flex items-center gap-1 text-xs text-muted-foreground">Press <Kbd>Shift</Kbd><Kbd>J</Kbd> anytime to search or jump</p>
      </div>

      <div class="mb-4 flex items-center gap-2">
        {#if currentFolder}
          <button type="button" class="flex items-center gap-1 text-sm font-semibold text-link hover:underline" onclick={() => (folderId = null)}>
            <Icon icon={icons.ArrowLeft} size={14} /> All projects
          </button>
          <span class="flex items-center gap-1.5 text-sm font-bold"><span class={cn('h-2.5 w-2.5 rounded-full', colorOf(currentFolder.color).dot)}></span>{currentFolder.name}</span>
          <button type="button" class="ml-auto text-xs text-muted-foreground hover:text-destructive" onclick={() => deleteFolder(currentFolder)}>Remove folder</button>
        {:else}
          <label class="relative flex-1">
            <Icon icon={icons.Search} size={14} class="absolute left-2.5 top-2.5 text-muted-foreground" />
            <input bind:value={filter} placeholder="Filter projects…" aria-label="Filter projects" class="h-9 w-full rounded-md border border-input bg-card pl-8 pr-3 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
          </label>
        {/if}
      </div>

      <div class="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {#if !folderId && !filter.trim()}
          {#each folders as f (f.id)}
            <button
              type="button"
              onclick={() => (folderId = f.id)}
              ondragover={(e) => {
                e.preventDefault()
                dropTarget = f.id
              }}
              ondragleave={() => (dropTarget = null)}
              ondrop={() => onDrop(f.id)}
              class={cn(
                'flex min-h-[84px] flex-col items-center justify-center rounded-lg border bg-card p-4 text-center shadow-sm transition-all hover:-translate-y-px hover:shadow-md',
                dropTarget === f.id && 'ring-2 ring-primary',
              )}
            >
              <span class="flex items-center gap-2 font-bold"><Icon icon={icons.Folder} class={cn('rounded p-0.5 text-white', colorOf(f.color).strong)} size={18} />{f.name}</span>
              <span class="text-xs text-muted-foreground">{f.projectCount} {f.projectCount === 1 ? 'project' : 'projects'}</span>
            </button>
          {/each}
        {/if}

        {#each shown as p (p.id)}
          <article
            draggable="true"
            ondragstart={() => (dragging = p.id)}
            ondragend={() => {
              dragging = null
              dropTarget = null
            }}
            class={cn('group relative flex min-h-[120px] flex-col rounded-lg border bg-card p-4 shadow-sm transition-all hover:-translate-y-px hover:shadow-md', dragging === p.id && 'opacity-50')}
          >
            <div class="flex items-start gap-2">
              <ProjectMark project={p} size={22} class="mt-0.5" />
              <Link href={`/projects/${p.id}`} class="min-w-0 flex-1 font-bold leading-snug after:absolute after:inset-0 hover:underline">{p.name}</Link>
              <button type="button" onclick={() => star(p)} class={cn('relative z-10 rounded p-0.5 transition-colors', p.starred ? 'text-amber-500' : 'text-muted-foreground/40 hover:text-amber-500')} aria-label={p.starred ? 'Unstar' : 'Star'} aria-pressed={p.starred}>
                <Icon icon={icons.Star} size={16} class={p.starred ? 'fill-current' : ''} />
              </button>
            </div>
            {#if p.description}<p class="mt-1 line-clamp-2 text-[13px] text-muted-foreground">{p.description}</p>{/if}
            <div class="mt-auto flex items-center gap-2 pt-3">
              {#if p.access === 'all'}
                <span class="rounded bg-sky-100 px-1.5 py-0.5 text-[11px] font-semibold text-sky-900 dark:bg-sky-900/40 dark:text-sky-200">All-access</span>
              {:else if p.memberCount > 8}
                <span class="text-xs font-medium text-muted-foreground">{p.memberCount} people</span>
              {:else}
                <AvatarStack people={p.members} size={20} />
              {/if}
              <span class="relative z-10 ml-auto opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <Popover align="end" contentClass="w-52">
                  {#snippet trigger({ toggle })}
                    <button type="button" onclick={toggle} class="rounded p-1 text-muted-foreground hover:bg-muted" aria-label={`Options for ${p.name}`}><Icon icon={icons.Ellipsis} size={14} /></button>
                  {/snippet}
                  {#snippet children({ close })}
                    <MenuLabel>Move to folder</MenuLabel>
                    {#each folders as f (f.id)}
                      <MenuItem icon={icons.Folder} onclick={() => { close(); moveTo(p, f.id) }}>{f.name}{#if p.folderId === f.id} ✓{/if}</MenuItem>
                    {/each}
                    {#if p.folderId}<MenuItem icon={icons.X} onclick={() => { close(); moveTo(p, null) }}>Take out of folder</MenuItem>{/if}
                    {#if !folders.length}<p class="px-2 py-1 text-xs text-muted-foreground">No folders yet.</p>{/if}
                  {/snippet}
                </Popover>
              </span>
            </div>
          </article>
        {/each}

        {#if chrome.accountRole !== 'client'}
        <Link href="/projects/new" class="flex min-h-[120px] flex-col items-center justify-center gap-1 rounded-lg border border-dashed text-sm font-medium text-muted-foreground transition-colors hover:border-solid hover:bg-card hover:text-foreground">
          <Icon icon={icons.Plus} size={18} /> New project
        </Link>
        {/if}
      </div>
      {#if !shown.length && (folderId || filter.trim())}
        <p class="mt-4 text-center text-sm text-muted-foreground">No projects here yet.</p>
      {/if}
    </section>

    <!-- Right: most recent activity -->
    <aside class="lg:pt-24" aria-label="Most recent activity">
      <h2 class="mb-3 text-sm font-bold">Most recent activity <Link href="/activity" class="ml-1 text-xs font-normal text-link underline">View all</Link></h2>
      <ul class="grid gap-3">
        {#each recent as a (a.id)}
          <li><ActivityItem activity={a} compact /></li>
        {:else}
          <li class="text-sm text-muted-foreground">Nothing has happened yet. Make a project and get going.</li>
        {/each}
      </ul>
      {#if active.length}
        <p class="mt-6 text-sm font-semibold">{active.length} {active.length === 1 ? 'person' : 'people'} active in the last 24 hours</p>
        <div class="mt-2"><AvatarStack people={active} size={26} max={10} /></div>
      {/if}
    </aside>
  </div>

  <Dialog bind:open={folderDialog} title="Add a folder" description="Group related projects together on Home. Drag a project card onto a folder to file it.">
    <div class="grid gap-4">
      <Field id="folder-name" label="Folder name" error={errors.name}>
        <Input id="folder-name" bind:value={folderName} placeholder="e.g. Client work" onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && addFolder()} />
      </Field>
      <Field label="Color"><ColorPicker bind:value={folderColor} /></Field>
    </div>
    {#snippet footer()}
      <Button variant="outline" onclick={() => (folderDialog = false)}>Cancel</Button>
      <Button onclick={addFolder} disabled={!folderName.trim()}>Add folder</Button>
    {/snippet}
  </Dialog>

  <Dialog bind:open={inviteDialog} title="Invite people to this workspace" description="They'll get an email with a link to set their password.">
    <div class="grid gap-4">
      <Field id="inv-name" label="Name" error={errors.name}><Input id="inv-name" bind:value={invite.name} /></Field>
      <Field id="inv-email" label="Email" error={errors.email}><Input id="inv-email" type="email" bind:value={invite.email} /></Field>
      <Field id="inv-role" label="Role">
        <Select id="inv-role" bind:value={invite.role} options={[{ value: 'member', label: 'Member' }, { value: 'admin', label: 'Admin (can use Adminland)' }, { value: 'client', label: 'Client (only projects they’re added to)' }]} />
      </Field>
    </div>
    {#snippet footer()}
      <Button variant="outline" onclick={() => (inviteDialog = false)}>Cancel</Button>
      <Button onclick={sendInvite}>Send invitation</Button>
    {/snippet}
  </Dialog>
</AppShell>
