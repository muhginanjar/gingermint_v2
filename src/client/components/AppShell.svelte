<script lang="ts" module>
  export type Crumb = { label: string; href?: string }
</script>

<script lang="ts">
  /**
   * The signed-in chrome shared by every app page:
   *  - top bar: breadcrumbs · account button (opens the Jump menu) · New for You · avatar menu
   *  - a tinted canvas (home = ginger, project = mint, global = slate)
   *  - My Bar (bottom), New for You sheet, Jump menu, new-ping dialog,
   *    event reminders, toasts, keyboard shortcuts + hold-Shift keycaps.
   */
  import { Link, router, usePage } from '@inertiajs/svelte'
  import { type Snippet, untrack } from 'svelte'
  import type { ChromeProps } from '../../shared/models'
  import type { SharedPageProps } from '../../shared/types'
  import { api } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { isTyping } from '../lib/shortcuts'
  import { toast, ui } from '../lib/state.svelte'
  import Brand from './Brand.svelte'
  import WorkspaceMark from './WorkspaceMark.svelte'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'
  import MenuItem from './ui/MenuItem.svelte'
  import Popover from './ui/Popover.svelte'
  import EventReminder from './shell/EventReminder.svelte'
  import JumpMenu from './shell/JumpMenu.svelte'
  import Keycap from './shell/Keycap.svelte'
  import MyBar from './shell/MyBar.svelte'
  import NewForYou from './shell/NewForYou.svelte'
  import PingComposer from './shell/PingComposer.svelte'
  import ShortcutsDialog from './shell/ShortcutsDialog.svelte'
  import Toaster from './shell/Toaster.svelte'

  let {
    tint = 'global',
    crumbs = [],
    title,
    wide = false,
    bare = false,
    children,
  }: {
    tint?: 'home' | 'project' | 'global'
    crumbs?: Crumb[]
    title?: string
    wide?: boolean
    /** When true the page draws its own layout (no centered sheet). */
    bare?: boolean
    children: Snippet
  } = $props()

  const page = usePage<SharedPageProps & { chrome?: ChromeProps }>()
  const user = $derived(page.props.auth.user)
  const chrome = $derived(page.props.chrome)
  const otherUnread = $derived((chrome?.workspaces ?? []).some((w) => !w.current && w.unread > 0))

  // Seed badge counts from the page payload on every navigation.
  $effect(() => {
    if (chrome) {
      ui.unread = chrome.unreadCount
      ui.pingUnread = chrome.pingUnread
    }
  })

  // One-shot flash → toast. untrack: toast() touches the toast list, which
  // must not become a dependency (it would re-fire on every dismiss).
  $effect(() => {
    const flash = page.flash as { success?: string; error?: string } | undefined
    untrack(() => {
      if (flash?.success) toast(String(flash.success))
      if (flash?.error) toast(String(flash.error), 'error', 6000)
    })
  })

  // Poll unread counts (every 30s and on focus).
  $effect(() => {
    const refresh = () =>
      api
        .get<{ unreadCount: number; pingUnread: number }>('/my/counts')
        .then((d) => {
          ui.unread = d.unreadCount
          ui.pingUnread = d.pingUnread
        })
        .catch(() => {})
    const t = setInterval(refresh, 30_000)
    window.addEventListener('focus', refresh)
    return () => {
      clearInterval(t)
      window.removeEventListener('focus', refresh)
    }
  })

  // Close transient panels on navigation.
  $effect(() => {
    void page.url
    ui.jumpOpen = false
    ui.myPanel = null
  })

  // Global keyboard shortcuts + hold-Shift keycap hints.
  $effect(() => {
    let shiftTimer: ReturnType<typeof setTimeout> | undefined
    const go = (url: string) => router.visit(url)
    const onDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        ui.jumpOpen = !ui.jumpOpen
        return
      }
      if (e.key === 'Shift' && !e.repeat) {
        shiftTimer = setTimeout(() => (ui.showKeycaps = true), 450)
        return
      }
      clearTimeout(shiftTimer)
      ui.showKeycaps = false
      if (isTyping(e) || e.metaKey || e.ctrlKey || e.altKey) return
      if (e.key === '?') {
        e.preventDefault()
        ui.shortcutsOpen = true
        return
      }
      if (!e.shiftKey) return
      const digit = e.code.startsWith('Digit') ? Number(e.code.slice(5)) : 0
      const panels = [null, 'tasks', 'events', 'today', 'bookmarks', 'notes'] as const
      if (digit >= 1 && digit <= 5) {
        e.preventDefault()
        const p = panels[digit] ?? null
        ui.myPanel = ui.myPanel === p ? null : p
        return
      }
      const map: Record<string, () => void> = {
        J: () => (ui.jumpOpen = !ui.jumpOpen),
        H: () => go('/home'),
        A: () => go('/activity'),
        C: () => go('/calendar'),
        R: () => go('/reports'),
        E: () => go('/everything'),
        P: () => go('/pings'),
        N: () => (ui.nfyOpen = !ui.nfyOpen),
      }
      const action = map[e.key.toUpperCase()]
      if (action) {
        e.preventDefault()
        action()
      }
    }
    const onUp = (e: KeyboardEvent) => {
      if (e.key === 'Shift') {
        clearTimeout(shiftTimer)
        ui.showKeycaps = false
      }
    }
    const onBlur = () => {
      clearTimeout(shiftTimer)
      ui.showKeycaps = false
    }
    document.addEventListener('keydown', onDown)
    document.addEventListener('keyup', onUp)
    window.addEventListener('blur', onBlur)
    return () => {
      document.removeEventListener('keydown', onDown)
      document.removeEventListener('keyup', onUp)
      window.removeEventListener('blur', onBlur)
    }
  })

  // Theme toggle (persisted; the head script applies it before paint).
  let theme = $state<'light' | 'dark'>('light')
  $effect(() => {
    theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  })
  function toggleTheme() {
    theme = theme === 'dark' ? 'light' : 'dark'
    document.documentElement.setAttribute('data-theme', theme)
    document.documentElement.style.backgroundColor = ''
    try {
      localStorage.setItem('theme', theme)
    } catch {
      /* private mode */
    }
  }

  let menuOpen = $state(false)

  const TINT = { home: 'bg-tint-home', project: 'bg-tint-project', global: 'bg-tint-global' }
  const HEADER = { home: 'bg-tint-home/85', project: 'bg-tint-project/85', global: 'bg-tint-global/85' }
</script>

<svelte:head>{#if title}<title>{title} · {chrome?.accountName ?? 'GingerMint'}</title>{/if}</svelte:head>

<div class={cn('min-h-screen', TINT[tint])}>
  <header class={cn('sticky top-0 z-30 border-b border-black/5 backdrop-blur dark:border-white/5', HEADER[tint])}>
    <div class="mx-auto grid h-14 max-w-[1400px] grid-cols-[1fr_auto_1fr] items-center gap-2 px-3 sm:px-5">
      <nav aria-label="Breadcrumb" class="flex min-w-0 items-center gap-1 text-sm">
        <Link href="/home" class="flex shrink-0 items-center rounded-md p-1 hover:bg-black/5 dark:hover:bg-white/5" aria-label="Home">
          <Brand size={26} />
        </Link>
        {#each crumbs as c, i (i)}
          <Icon icon={icons.ChevronRight} size={14} class="shrink-0 text-muted-foreground" />
          {#if c.href}
            <Link href={c.href} class="truncate rounded px-1 font-medium text-foreground/80 hover:bg-black/5 hover:text-foreground dark:hover:bg-white/5">{c.label}</Link>
          {:else}
            <span class="truncate px-1 text-muted-foreground">{c.label}</span>
          {/if}
        {/each}
      </nav>

      <button
        type="button"
        onclick={() => (ui.jumpOpen = true)}
        class="relative flex h-9 items-center gap-1.5 rounded-full px-3 text-[15px] font-bold transition-colors hover:bg-black/5 dark:hover:bg-white/10"
        aria-haspopup="dialog"
        aria-label="Open the jump menu"
      >
        {#if chrome}<WorkspaceMark workspace={{ id: chrome.accountId, name: chrome.accountName, logoUrl: chrome.accountLogo }} size={22} class="rounded-md" />{/if}
        <span class="max-w-[40vw] truncate">{chrome?.accountName ?? 'GingerMint'}</span>
        {#if otherUnread}<span class="h-2 w-2 rounded-full bg-ginger" title="Unread in another workspace"></span>{/if}
        <Icon icon={icons.ChevronDown} size={14} class="text-muted-foreground" />
        <Keycap k="⇧J" />
      </button>

      <div class="flex items-center justify-end gap-1">
        <button
          type="button"
          onclick={() => (ui.jumpOpen = true)}
          class="hidden h-8 items-center gap-2 rounded-md border border-black/10 bg-card/70 px-2.5 text-[13px] text-muted-foreground hover:text-foreground sm:flex dark:border-white/10"
          aria-label="Search"
        >
          <Icon icon={icons.Search} size={14} /> <span class="hidden lg:inline">Search</span>
          <kbd class="hidden font-mono text-[11px] lg:inline">⌘K</kbd>
        </button>
        <Link
          href="/pings"
          class="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label={`Pings${ui.pingUnread ? ` (${ui.pingUnread} unread)` : ''}`}
        >
          <Icon icon={icons.MessageCircle} size={18} />
          {#if ui.pingUnread}<span class="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-ginger ring-2 ring-card"></span>{/if}
          <Keycap k="⇧P" />
        </Link>
        <button
          type="button"
          onclick={() => (ui.nfyOpen = true)}
          class="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground hover:bg-black/5 hover:text-foreground dark:hover:bg-white/10"
          aria-label={`New for you${ui.unread ? ` (${ui.unread} unread)` : ''}`}
        >
          <Icon icon={ui.unread ? icons.BellRing : icons.Bell} size={18} />
          {#if ui.unread}
            <span class="absolute -right-0.5 -top-0.5 min-w-[18px] rounded-full bg-ginger px-1 text-center text-[11px] font-bold leading-[18px] text-white">{ui.unread > 99 ? '99+' : ui.unread}</span>
          {/if}
          <Keycap k="⇧N" />
        </button>
        {#if user}
          <Popover bind:open={menuOpen} align="end" contentClass="w-60">
            {#snippet trigger({ toggle })}
              <button type="button" onclick={toggle} class="ml-1 rounded-full" aria-label="Your menu" aria-expanded={menuOpen}>
                <Avatar person={user} size={30} />
              </button>
            {/snippet}
            {#snippet children({ close })}
              <div class="flex items-center gap-2 px-2 py-2">
                <Avatar person={user} size={36} />
                <div class="min-w-0">
                  <p class="truncate text-sm font-semibold">{user.name}</p>
                  <p class="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              </div>
              <div class="my-1 h-px bg-border"></div>
              <MenuItem href="/profile" icon={icons.User} onclick={close}>Profile & settings</MenuItem>
              <MenuItem href={`/people/${user.id}`} icon={icons.Activity} onclick={close}>My activity</MenuItem>
              <MenuItem href="/workspaces" icon={icons.LayoutGrid} onclick={close}>Workspaces{#if (chrome?.workspaces.length ?? 0) > 1}<span class="ml-auto text-xs text-muted-foreground">{chrome?.workspaces.length}</span>{/if}</MenuItem>
              {#if user.role === 'admin'}<MenuItem href="/adminland" icon={icons.KeyRound} onclick={close}>Adminland</MenuItem>{/if}
              <MenuItem icon={theme === 'dark' ? icons.Sun : icons.Moon} onclick={toggleTheme}>{theme === 'dark' ? 'Light mode' : 'Dark mode'}</MenuItem>
              <MenuItem icon={icons.Keyboard} onclick={() => { close(); ui.shortcutsOpen = true }}>Keyboard shortcuts</MenuItem>
              <div class="my-1 h-px bg-border"></div>
              <MenuItem icon={icons.LogOut} danger onclick={() => router.post('/logout')}>Log out</MenuItem>
            {/snippet}
          </Popover>
        {/if}
      </div>
    </div>
  </header>

  <main class={cn('px-3 pb-28 pt-4 sm:px-5 sm:pt-6', !bare && 'mx-auto', !bare && (wide ? 'max-w-[1400px]' : 'max-w-[1120px]'))}>
    {@render children()}
  </main>

  {#if user}
    <MyBar {user} />
    <button
      type="button"
      onclick={() => (ui.nfyOpen = true)}
      class="fixed bottom-4 right-3 z-40 flex h-11 w-11 items-center justify-center rounded-full bg-foreground text-background shadow-lg md:hidden"
      aria-label="New for you"
    >
      <Icon icon={icons.Bell} size={18} />
      {#if ui.unread}<span class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-ginger ring-2 ring-card"></span>{/if}
    </button>
  {/if}
</div>

<JumpMenu />
<NewForYou />
<PingComposer />
<ShortcutsDialog />
<EventReminder />
<Toaster />
