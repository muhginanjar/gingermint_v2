<script lang="ts">
  /**
   * New for You: notifications + Pings in a sidebar, processed without
   * leaving the page. Mark read, mark all read, Bubble Up, dismiss.
   */
  import { router } from '@inertiajs/svelte'
  import type { Notification, PingThread } from '../../../shared/models'
  import { api } from '../../lib/api'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { toast, ui } from '../../lib/state.svelte'
  import { shortAgo, formatDateTime } from '../../lib/time'
  import Avatar from '../ui/Avatar.svelte'
  import Icon from '../ui/Icon.svelte'
  import Sheet from '../ui/Sheet.svelte'
  import BubbleUpMenu from '../BubbleUpMenu.svelte'
  import { buttonVariants } from '../../lib/variants'

  type Feed = {
    unread: Notification[]
    previous: Notification[]
    bubbled: Notification[]
    pings: PingThread[]
    unreadCount: number
    pingUnread: number
  }

  let feed = $state<Feed | null>(null)
  let loading = $state(false)

  async function load() {
    loading = true
    try {
      feed = await api.get<Feed>('/my/notifications')
      ui.unread = feed.unreadCount
      ui.pingUnread = feed.pingUnread
    } finally {
      loading = false
    }
  }

  $effect(() => {
    if (ui.nfyOpen) void load()
  })

  async function open(n: Notification) {
    if (!n.readAt) await api.post(`/my/notifications/${n.id}/read`).catch(() => {})
    ui.nfyOpen = false
    router.visit(n.url)
  }

  async function markAll() {
    await api.post('/my/notifications/read')
    toast('All caught up.')
    await load()
  }

  async function bubble(n: Notification, iso: string) {
    await api.post('/my/bubble-ups', { notificationId: n.id, when: iso })
    toast(`Bubbles up ${formatDateTime(iso)}.`)
    await load()
  }

  async function dismiss(n: Notification) {
    await api.delete(`/my/notifications/${n.id}`)
    await load()
  }

  async function unbubble(n: Notification) {
    await api.post(`/my/notifications/${n.id}/unbubble`)
    await load()
  }

  function openPing(t: PingThread) {
    ui.nfyOpen = false
    router.visit(`/pings/${t.id}`)
  }

  const KIND_ICON: Record<string, typeof icons.Bell> = {
    mention: icons.AtSign,
    comment: icons.MessageCircle,
    assignment: icons.CircleCheck,
    completed: icons.CircleCheck,
    due_date: icons.CalendarClock,
    event: icons.CalendarDays,
    message: icons.Megaphone,
    ping: icons.MessageCircle,
    chat: icons.MessagesSquare,
    checkin: icons.MessageCircleQuestionMark,
    bubble_up: icons.ClockArrowUp,
    invite: icons.UserPlus,
    forward: icons.Forward,
  }
</script>

{#snippet item(n: Notification, faded: boolean)}
  <li class="group relative">
    <button
      type="button"
      onclick={() => open(n)}
      class={cn(
        'flex w-full gap-3 rounded-md px-2 py-2.5 text-left transition-colors hover:bg-muted',
        faded && 'opacity-75',
      )}
    >
      <span class="relative mt-0.5">
        <Avatar person={n.actor} size={32} />
        <span class="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card text-primary ring-1 ring-border">
          <Icon icon={KIND_ICON[n.kind] ?? icons.Bell} size={10} strokeWidth={2.5} />
        </span>
      </span>
      <span class="min-w-0 flex-1 pr-6">
        <span class={cn('block text-sm leading-snug', !n.readAt && 'font-semibold')}>
          {#if n.kind === 'mention'}<span class="rounded bg-ginger-soft px-1">@mentioned you</span> {n.title.replace(/^@mentioned you in: /, 'in ')}{:else}{n.title}{/if}
        </span>
        {#if n.excerpt}<span class="mt-0.5 line-clamp-2 block text-[13px] text-muted-foreground">{n.excerpt}</span>{/if}
        <span class="mt-1 block text-xs text-muted-foreground">
          {shortAgo(n.bubbleUpAt ?? n.createdAt)}{#if n.actor} · {n.actor.name}{/if}{#if n.projectName} · {n.projectName}{/if}
        </span>
      </span>
      {#if !n.readAt}<span class="absolute right-3 top-3.5 h-2 w-2 rounded-full bg-ginger" aria-label="Unread"></span>{/if}
    </button>
    <div class="absolute right-1 top-8 hidden items-center gap-0.5 rounded-md border bg-card p-0.5 shadow-sm group-focus-within:flex group-hover:flex">
      <BubbleUpMenu onpick={(iso) => bubble(n, iso)}>
        {#snippet button({ toggle })}
          <button type="button" class={buttonVariants({ variant: 'ghost', size: 'icon-sm', class: 'h-7 w-7' })} title="Bubble up later" aria-label="Bubble up later" onclick={toggle}>
            <Icon icon={icons.ClockArrowUp} />
          </button>
        {/snippet}
      </BubbleUpMenu>
      <button type="button" class={buttonVariants({ variant: 'ghost', size: 'icon-sm', class: 'h-7 w-7' })} title="Dismiss" aria-label="Dismiss" onclick={() => dismiss(n)}>
        <Icon icon={icons.X} />
      </button>
    </div>
  </li>
{/snippet}

<Sheet bind:open={ui.nfyOpen} label="New for you">
  <div class="border-b px-4 pb-3 pt-4">
    <div class="flex items-center justify-between">
      <h2 class="text-sm font-bold">Pings</h2>
      <button type="button" class="text-xs text-link hover:underline" onclick={() => { ui.nfyOpen = false; ui.pingOpen = true }}>
        + New ping
      </button>
    </div>
    <div class="mt-2 flex gap-3 overflow-x-auto pb-1">
      {#each feed?.pings ?? [] as t (t.id)}
        <button type="button" onclick={() => openPing(t)} class="flex w-14 shrink-0 flex-col items-center gap-1 text-center">
          <span class="relative">
            <Avatar person={t.participants[0] ?? null} size={38} />
            {#if t.unread}<span class="absolute -right-0.5 -top-0.5 h-3 w-3 rounded-full bg-ginger ring-2 ring-card"></span>{/if}
          </span>
          <span class="w-full truncate text-[11px] text-muted-foreground">{t.participants.map((p) => p.name.split(' ')[0]).join(', ')}</span>
        </button>
      {:else}
        <p class="text-xs text-muted-foreground">No pings yet. Start a private conversation with anyone.</p>
      {/each}
    </div>
  </div>
  <div class="flex-1 overflow-y-auto px-2 py-3">
    <div class="flex items-center justify-between px-2">
      <h2 class="text-sm font-bold text-ginger">New for you</h2>
      {#if feed?.unread.length}
        <button type="button" class="text-xs text-muted-foreground hover:text-foreground hover:underline" onclick={markAll}>Mark all read</button>
      {/if}
    </div>
    {#if loading && !feed}
      <p class="px-2 py-8 text-center text-sm text-muted-foreground">Loading…</p>
    {:else if feed && feed.unread.length === 0}
      <div class="mx-2 my-3 rounded-md bg-muted/60 px-3 py-4 text-center text-sm text-muted-foreground">
        <Icon icon={icons.Check} class="mx-auto mb-1 text-primary" size={18} />
        You're all caught up.
      </div>
    {/if}
    <ul class="mt-1">
      {#each feed?.unread ?? [] as n (n.id)}{@render item(n, false)}{/each}
    </ul>
    {#if feed?.bubbled.length}
      <h3 class="mt-5 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Bubbling up later</h3>
      <ul class="mt-1">
        {#each feed.bubbled as n (n.id)}
          <li class="flex items-center gap-2 rounded-md px-2 py-2 text-sm">
            <Icon icon={icons.ClockArrowUp} class="text-muted-foreground" />
            <span class="min-w-0 flex-1 truncate">{n.title}</span>
            <span class="text-xs text-muted-foreground">{formatDateTime(n.bubbleUpAt ?? n.createdAt)}</span>
            <button type="button" class="text-xs text-link hover:underline" onclick={() => unbubble(n)}>Now</button>
          </li>
        {/each}
      </ul>
    {/if}
    {#if feed?.previous.length}
      <h3 class="mt-5 px-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Previous notifications</h3>
      <ul class="mt-1">
        {#each feed.previous as n (n.id)}{@render item(n, true)}{/each}
      </ul>
    {/if}
  </div>
</Sheet>
