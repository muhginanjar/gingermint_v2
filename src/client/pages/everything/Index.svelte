<script lang="ts">
  /** Everything: all messages / docs & files / comments / check-ins / forwarded emails across every project. */
  import { Link, router } from '@inertiajs/svelte'
  import type { Person } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { formatDate } from '../../lib/time'

  type Item = {
    id: number
    title: string
    excerpt: string
    body: string
    url: string
    projectName: string
    author: Person | null
    kind: string
    fileUrl: string | null
    mime: string | null
    createdAt: string
  }

  let { kind, q, items }: { kind: string; q: string; items: Item[] } = $props()

  const KINDS = [
    { value: 'messages', label: 'All messages', icon: icons.Megaphone },
    { value: 'files', label: 'All docs & files', icon: icons.Folder },
    { value: 'comments', label: 'All comments', icon: icons.MessageCircle },
    { value: 'checkins', label: 'All check-ins', icon: icons.MessageCircleQuestionMark },
    { value: 'forwards', label: 'All forwarded emails', icon: icons.Forward },
  ]
  const current = $derived(KINDS.find((k) => k.value === kind) ?? KINDS[0]!)
  let search = $state(q)
  let timer: ReturnType<typeof setTimeout> | undefined
  let openForward = $state<number | null>(null)

  $effect(() => {
    const m = window.location.hash.match(/^#forward-(\d+)$/)
    if (m) openForward = Number(m[1])
  })

  function onInput() {
    clearTimeout(timer)
    timer = setTimeout(() => router.get(`/everything/${kind}${search.trim() ? `?q=${encodeURIComponent(search.trim())}` : ''}`, {}, { preserveState: true, preserveScroll: true, replace: true }), 250)
  }
</script>

<AppShell tint="global" title={current.label} crumbs={[{ label: 'Everything', href: '/everything' }, { label: current.label }]} wide>
  <div class="grid gap-5 lg:grid-cols-[220px_1fr]">
    <nav class="flex gap-1 overflow-x-auto lg:flex-col" aria-label="Everything">
      {#each KINDS as k (k.value)}
        <Link href={`/everything/${k.value}`} class={cn('flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-medium no-underline', k.value === kind ? 'bg-foreground text-background' : 'text-foreground hover:bg-card')}>
          <Icon icon={k.icon} size={15} />{k.label}
        </Link>
      {/each}
    </nav>
    <Sheet>
      <p class="text-xs font-bold uppercase tracking-wider text-muted-foreground">Everything</p>
      <h1 class="text-[32px] font-black tracking-tight">{current.label}</h1>
      <input bind:value={search} oninput={onInput} placeholder="Filter across all projects…" aria-label="Filter" class="mt-3 h-9 w-full max-w-sm rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />

      <ul class="mt-6 divide-y border-t">
        {#each items as it (it.kind + it.id)}
          <li id={kind === 'forwards' ? `forward-${it.id}` : undefined} class="py-4">
            {#if kind === 'forwards'}
              <button type="button" class="flex w-full gap-3 text-left" onclick={() => (openForward = openForward === it.id ? null : it.id)} aria-expanded={openForward === it.id}>
                <span class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-muted"><Icon icon={icons.Mail} /></span>
                <span class="min-w-0 flex-1">
                  <span class="block font-bold">{it.title} <span class="font-normal text-muted-foreground">— {it.projectName}</span></span>
                  <span class="block text-sm text-muted-foreground">{it.kind} · {formatDate(it.createdAt)}</span>
                  {#if openForward !== it.id}<span class="mt-1 line-clamp-2 block text-sm text-muted-foreground">{it.excerpt}</span>{/if}
                </span>
              </button>
              {#if openForward === it.id}<div class="ml-12 mt-3 whitespace-pre-wrap rounded-md border bg-muted/30 p-4 text-sm">{it.body}</div>{/if}
            {:else}
              <Link href={it.url} class="flex gap-3 text-foreground no-underline">
                {#if kind === 'files'}
                  {#if it.fileUrl && it.mime?.startsWith('image/')}
                    <img src={it.fileUrl} alt="" class="h-10 w-10 shrink-0 rounded-md border object-cover" loading="lazy" />
                  {:else}
                    <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-muted"><Icon icon={it.kind === 'doc' ? icons.FileText : it.kind === 'link' ? icons.Link : icons.File} /></span>
                  {/if}
                {:else}
                  <Avatar person={it.author} size={40} />
                {/if}
                <div class="min-w-0 flex-1">
                  <p class="hover:underline"><span class="font-bold">{it.title}</span> <span class="text-muted-foreground">— {it.projectName}</span></p>
                  <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground"><span class="text-ginger">{it.author?.name ?? ''}{it.author ? ' · ' : ''}{formatDate(it.createdAt)}</span> {it.excerpt ? `• ${it.excerpt}` : ''}</p>
                </div>
              </Link>
            {/if}
          </li>
        {:else}
          <li class="py-10 text-center text-sm text-muted-foreground">{q ? 'Nothing matches.' : 'Nothing here yet.'}</li>
        {/each}
      </ul>
    </Sheet>
  </div>
</AppShell>
