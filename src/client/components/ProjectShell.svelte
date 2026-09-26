<script lang="ts">
  /** Layout for everything inside a project: mint canvas, breadcrumb, tool switcher, the sheet. */
  import { Link } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import type { ProjectRef, ToolKind } from '../../shared/models'
  import { cn } from '../lib/cn'
  import { toolHref, toolIcon } from '../lib/tools'
  import AppShell, { type Crumb } from './AppShell.svelte'
  import Icon from './ui/Icon.svelte'
  import ProjectMark from './ProjectMark.svelte'
  import Sheet from './Sheet.svelte'

  let {
    project,
    tool,
    crumbs = [],
    title,
    wide = false,
    sheet = true,
    children,
  }: {
    project: ProjectRef
    tool?: ToolKind
    crumbs?: Crumb[]
    title?: string
    wide?: boolean
    sheet?: boolean
    children: Snippet
  } = $props()

  const toolEntry = $derived(project.tools.find((t) => t.kind === tool))
  const allCrumbs = $derived<Crumb[]>([
    { label: project.name, href: `/projects/${project.id}` },
    ...(toolEntry ? [{ label: toolEntry.name, href: crumbs.length ? toolHref(project.id, toolEntry.kind) : undefined }] : []),
    ...crumbs,
  ])
</script>

<AppShell tint="project" crumbs={allCrumbs} title={title ?? toolEntry?.name ?? project.name} {wide}>
  <div class="mb-3 flex items-center justify-center gap-2">
    <Link href={`/projects/${project.id}`} class="flex min-w-0 items-center gap-2 rounded-md px-2 py-1 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5">
      <ProjectMark {project} size={22} />
      <span class="truncate">{project.name}</span>
    </Link>
    {#if project.myRole === 'client'}
      <span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">Client view</span>
    {/if}
  </div>
  <nav aria-label="Project tools" class="mb-4 flex justify-center">
    <div class="flex max-w-full gap-0.5 overflow-x-auto rounded-full border border-black/5 bg-card/60 p-1 backdrop-blur dark:border-white/5">
      {#each project.tools as t (t.id)}
        <Link
          href={toolHref(project.id, t.kind)}
          class={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-[13px] font-medium transition-colors',
            t.kind === tool ? 'bg-foreground text-background' : 'text-muted-foreground hover:bg-muted hover:text-foreground',
          )}
          aria-current={t.kind === tool ? 'page' : undefined}
        >
          <Icon icon={toolIcon(t.kind)} size={14} />
          <span class="hidden sm:inline">{t.name}</span>
        </Link>
      {/each}
    </div>
  </nav>
  {#if sheet}
    <Sheet>{@render children()}</Sheet>
  {:else}
    {@render children()}
  {/if}
</AppShell>
