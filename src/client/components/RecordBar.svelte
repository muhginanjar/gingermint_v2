<script lang="ts">
  /**
   * The bar at the top of any record page: back to the tool, Bookmark,
   * Notifying (subscribe), Bubble up, and the ··· options menu.
   */
  import { Link, router, usePage } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import { api } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { toast } from '../lib/state.svelte'
  import { formatDateTime } from '../lib/time'
  import { buttonVariants } from '../lib/variants'
  import BubbleUpMenu from './BubbleUpMenu.svelte'
  import Icon from './ui/Icon.svelte'
  import MenuItem from './ui/MenuItem.svelte'
  import Popover from './ui/Popover.svelte'

  let {
    backHref,
    backLabel,
    type,
    id,
    title,
    context = '',
    bookmarked = false,
    subscribed,
    menu,
  }: {
    backHref: string
    backLabel: string
    type: string
    id: number
    title: string
    context?: string
    bookmarked?: boolean
    subscribed?: boolean
    menu?: Snippet<[{ close: () => void }]>
  } = $props()

  const page = usePage()
  let isBookmarked = $state(bookmarked)
  let menuOpen = $state(false)

  $effect(() => {
    isBookmarked = bookmarked
  })

  async function toggleBookmark() {
    const url = page.url.split('#')[0]?.split('?')[0] ?? page.url
    const res = await api.post<{ bookmarked: boolean }>('/my/bookmarks', { url, title, kind: type, context })
    isBookmarked = res.bookmarked
    toast(res.bookmarked ? 'Bookmarked — find it in My Bookmarks.' : 'Bookmark removed.')
  }

  function toggleSubscribed() {
    router.post('/subscriptions', { type, id, on: !subscribed }, { preserveScroll: true })
  }

  async function bubble(iso: string) {
    await api.post('/my/bubble-ups', { type, id, when: iso })
    toast(`This will bubble up ${formatDateTime(iso)}.`)
  }

  async function copyLink() {
    menuOpen = false
    await navigator.clipboard?.writeText(window.location.href.split('#')[0] ?? window.location.href)
    toast('Link copied.')
  }
</script>

<div class="-mx-2 mb-4 flex flex-wrap items-center gap-1 sm:-mx-4">
  <Link href={backHref} class={buttonVariants({ variant: 'ghost', size: 'sm', class: 'text-muted-foreground' })}>
    <Icon icon={icons.ArrowLeft} /> {backLabel}
  </Link>
  <div class="ml-auto flex items-center gap-0.5">
    <button type="button" onclick={toggleBookmark} class={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-pressed={isBookmarked}>
      <Icon icon={isBookmarked ? icons.BookmarkCheck : icons.Bookmark} class={cn(isBookmarked && 'text-primary')} />
      <span class="hidden sm:inline">{isBookmarked ? 'Bookmarked' : 'Bookmark'}</span>
    </button>
    {#if subscribed !== undefined}
      <button type="button" onclick={toggleSubscribed} class={buttonVariants({ variant: 'ghost', size: 'sm' })} aria-pressed={subscribed} title={subscribed ? "You'll be notified about new comments" : 'Get notified about new comments'}>
        <Icon icon={subscribed ? icons.Bell : icons.BellOff} />
        <span class="hidden sm:inline">{subscribed ? 'Notifying' : 'Not notifying'}</span>
      </button>
    {/if}
    <BubbleUpMenu onpick={bubble} />
    <Popover bind:open={menuOpen} align="end" contentClass="w-56">
      {#snippet trigger({ toggle })}
        <button type="button" onclick={toggle} class={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} aria-label="More options" aria-expanded={menuOpen}>
          <Icon icon={icons.Ellipsis} />
        </button>
      {/snippet}
      {#snippet children({ close })}
        <MenuItem icon={icons.Copy} onclick={copyLink}>Copy link</MenuItem>
        {@render menu?.({ close })}
      {/snippet}
    </Popover>
  </div>
</div>
