<script lang="ts">
  /**
   * Universal menu / Jump (Shift+J, ⌘K): Activity · Calendar · Reports ·
   * Everything tiles, live search across all projects, recently visited
   * pages and projects grouped by folder. Arrow keys + Enter to go.
   */
  import { router, usePage } from '@inertiajs/svelte'
  import type { ChromeProps } from '../../../shared/models'
  import WorkspaceMark from '../WorkspaceMark.svelte'
  import type { IconNode } from 'lucide'
  import type { SearchResult, Visit } from '../../../shared/models'
  import { api } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'
  import { ui } from '../../lib/state.svelte'
  import Icon from '../ui/Icon.svelte'
  import Kbd from '../ui/Kbd.svelte'

  type JumpProject = { id: number; name: string; icon: string; color: string; folderId: number | null; starred: boolean }
  type Row = { url: string; title: string; context: string; icon: IconNode; tint?: string; emoji?: string }

  const page = usePage<{ chrome?: ChromeProps }>()
  const spaces = $derived(page.props.chrome?.workspaces ?? [])

  function switchTo(id: number) {
    ui.jumpOpen = false
    router.post(`/workspaces/${id}/switch`)
  }

  let q = $state('')
  let recent = $state<Visit[]>([])
  let projects = $state<JumpProject[]>([])
  let results = $state<SearchResult[]>([])
  let active = $state(0)
  let loading = $state(false)
  let input = $state<HTMLInputElement | null>(null)
  let timer: ReturnType<typeof setTimeout> | undefined

  const TILES = [
    { href: '/activity', label: 'Activity', icon: icons.Activity },
    { href: '/calendar', label: 'Calendar', icon: icons.CalendarDays },
    { href: '/reports', label: 'Reports', icon: icons.ChartPie },
    { href: '/everything', label: 'Everything', icon: icons.Globe },
  ]

  const KIND_ICON: Record<string, IconNode> = {
    project: icons.Star,
    message: icons.Megaphone,
    todo: icons.CircleCheck,
    todo_list: icons.ListChecks,
    todos: icons.ListChecks,
    card: icons.SquareKanban,
    card_table: icons.SquareKanban,
    doc: icons.FileText,
    docs: icons.Folder,
    file: icons.File,
    link: icons.Link,
    folder: icons.Folder,
    event: icons.CalendarDays,
    schedule: icons.CalendarDays,
    comment: icons.MessageCircle,
    chat: icons.MessagesSquare,
    chat_line: icons.MessagesSquare,
    checkin_answer: icons.MessageCircleQuestionMark,
    checkin_question: icons.MessageCircleQuestionMark,
    checkins: icons.MessageCircleQuestionMark,
    person: icons.User,
    ping: icons.MessageCircle,
    pings: icons.MessageCircle,
    message_board: icons.Megaphone,
    timesheet: icons.Timer,
  }

  async function load(query = '') {
    loading = true
    try {
      const data = await api.get<{ recent: Visit[]; projects: JumpProject[]; results: SearchResult[] }>(
        `/search/jump${query ? `?q=${encodeURIComponent(query)}` : ''}`,
      )
      recent = data.recent
      projects = data.projects
      results = data.results
      active = 0
    } catch {
      /* offline — keep previous */
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if (!ui.jumpOpen) return
    q = ''
    results = []
    void load()
    queueMicrotask(() => input?.focus())
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = prev
    }
  })

  function onInput() {
    clearTimeout(timer)
    timer = setTimeout(() => void load(q.trim()), 140)
  }

  const filteredProjects = $derived(
    q.trim() ? projects.filter((p) => p.name.toLowerCase().includes(q.trim().toLowerCase())) : projects,
  )

  const rows = $derived.by<Row[]>(() => {
    if (q.trim()) {
      const projectRows = filteredProjects.slice(0, 5).map((p) => ({
        url: `/projects/${p.id}`,
        title: p.name,
        context: 'Project',
        icon: icons.Star,
        tint: p.color,
        emoji: p.icon,
      }))
      const seen = new Set(projectRows.map((r) => r.url))
      return [
        ...projectRows,
        ...results
          .filter((r) => !seen.has(r.url))
          .map((r) => ({ url: r.url, title: r.title, context: r.context, icon: KIND_ICON[r.kind] ?? icons.File })),
      ]
    }
    return [
      ...recent.map((v) => ({
        url: v.url,
        title: v.title,
        context: v.context,
        icon: KIND_ICON[v.kind] ?? icons.File,
      })),
      ...projects.map((p) => ({ url: `/projects/${p.id}`, title: p.name, context: '', icon: icons.Star, tint: p.color, emoji: p.icon })),
    ]
  })

  function go(url: string) {
    ui.jumpOpen = false
    router.visit(url)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      active = Math.min(rows.length - 1, active + 1)
      document.getElementById(`jump-row-${active}`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = Math.max(0, active - 1)
      document.getElementById(`jump-row-${active}`)?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      const row = rows[active]
      if (row) {
        e.preventDefault()
        go(row.url)
      } else if (q.trim()) {
        go(`/search?q=${encodeURIComponent(q.trim())}`)
      }
    } else if (e.key === 'Escape') {
      ui.jumpOpen = false
    }
  }
</script>

{#if ui.jumpOpen}
  <div class="fixed inset-0 z-[90] flex items-start justify-center p-3 pt-[8vh]">
    <button
      type="button"
      tabindex="-1"
      aria-label="Close jump menu"
      class="fixed inset-0 cursor-default bg-black/40 animate-[fade-in_100ms_ease]"
      onclick={() => (ui.jumpOpen = false)}
    ></button>
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Jump menu"
      class="relative z-10 flex max-h-[80vh] w-full max-w-[560px] flex-col overflow-hidden rounded-xl border bg-popover shadow-2xl animate-[slide-up_140ms_ease]"
    >
      <div class="grid grid-cols-4 gap-2 p-3 pb-2">
        {#each TILES as t (t.href)}
          <button
            type="button"
            onclick={() => go(t.href)}
            class="flex flex-col items-center gap-1.5 rounded-lg bg-muted/70 px-2 py-3 text-[13px] font-medium transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Icon icon={t.icon} size={20} />
            {t.label}
          </button>
        {/each}
      </div>
      <div class="flex items-center gap-1.5 overflow-x-auto px-3 pb-2" aria-label="Workspaces">
        {#each spaces as w (w.id)}
          <button
            type="button"
            onclick={() => (w.current ? null : switchTo(w.id))}
            aria-current={w.current ? 'true' : undefined}
            class={cn('flex shrink-0 items-center gap-1.5 rounded-full border py-1 pl-1 pr-2.5 text-xs font-semibold', w.current ? 'border-foreground bg-foreground text-background' : 'hover:bg-muted')}
            title={w.current ? `You're in ${w.name}` : `Switch to ${w.name}`}
          >
            <WorkspaceMark workspace={w} size={20} class="rounded-full" />
            <span class="max-w-[10rem] truncate">{w.name}</span>
            {#if w.unread && !w.current}<span class="rounded-full bg-ginger px-1.5 text-[10px] text-white">{w.unread}</span>{/if}
          </button>
        {/each}
        <button type="button" onclick={() => go('/workspaces')} class="flex shrink-0 items-center gap-1 rounded-full border border-dashed px-2.5 py-1 text-xs font-medium text-muted-foreground hover:text-foreground">
          <Icon icon={icons.Plus} size={12} /> Workspace
        </button>
      </div>
      <div class="px-3 pb-2">
        <label class="flex h-10 items-center gap-2 rounded-lg border-2 border-ring/60 bg-card px-3 focus-within:border-ring">
          <Icon icon={icons.Search} class="text-muted-foreground" />
          <input
            bind:this={input}
            bind:value={q}
            oninput={onInput}
            onkeydown={onKey}
            placeholder="Search or jump to a project, person, or recent page"
            aria-label="Search or jump"
            class="h-full flex-1 bg-transparent text-[15px] outline-none placeholder:text-muted-foreground"
          />
          {#if loading}<span class="text-xs text-muted-foreground">…</span>{/if}
        </label>
      </div>
      <div class="flex-1 overflow-y-auto px-2 pb-2" role="listbox" aria-label="Results">
        {#if !q.trim() && recent.length}
          <p class="px-2 pb-1 pt-2 text-xs font-bold text-foreground">Recently visited</p>
        {/if}
        {#each rows as row, i (row.url + i)}
          {#if !q.trim() && i === recent.length}
            <div class="flex items-center justify-between px-2 pb-1 pt-3">
              <p class="text-xs font-bold text-foreground">Projects</p>
              <a href="/home" class="text-xs text-muted-foreground hover:underline" onclick={(e) => { e.preventDefault(); go('/home') }}>See all</a>
            </div>
          {/if}
          <button
            id={`jump-row-${i}`}
            type="button"
            role="option"
            aria-selected={i === active}
            onmouseenter={() => (active = i)}
            onclick={() => go(row.url)}
            class={cn(
              'flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm',
              i === active ? 'bg-accent text-accent-foreground' : 'hover:bg-muted',
            )}
          >
            {#if row.emoji}
              <span class={cn('flex h-5 w-5 items-center justify-center rounded-full text-[11px]', colorOf(row.tint).soft)}>{row.emoji}</span>
            {:else if row.tint}
              <span class={cn('flex h-5 w-5 items-center justify-center rounded-full text-white', colorOf(row.tint).strong)}>
                <Icon icon={row.icon} size={11} strokeWidth={2.5} />
              </span>
            {:else}
              <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary">
                <Icon icon={row.icon} size={12} />
              </span>
            {/if}
            <span class="min-w-0 flex-1 truncate font-medium">{row.title}</span>
            {#if row.context}<span class="max-w-[45%] truncate text-xs text-muted-foreground">{row.context}</span>{/if}
          </button>
        {:else}
          <p class="px-3 py-6 text-center text-sm text-muted-foreground">
            {q.trim() ? (loading ? 'Searching…' : 'Nothing matches that yet.') : 'Nothing here yet.'}
          </p>
        {/each}
        {#if q.trim()}
          <button
            type="button"
            onclick={() => go(`/search?q=${encodeURIComponent(q.trim())}`)}
            class="mt-1 flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm text-link hover:bg-muted"
          >
            <Icon icon={icons.Search} /> See all results for “{q.trim()}”
          </button>
        {/if}
      </div>
      <div class="flex items-center gap-3 border-t bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
        <span class="flex items-center gap-1"><Kbd>↑</Kbd><Kbd>↓</Kbd> move</span>
        <span class="flex items-center gap-1"><Kbd>↵</Kbd> open</span>
        <span class="flex items-center gap-1"><Kbd>esc</Kbd> close</span>
        <span class="ml-auto flex items-center gap-1"><Kbd>Shift</Kbd><Kbd>J</Kbd> anytime</span>
      </div>
    </div>
  </div>
{/if}
