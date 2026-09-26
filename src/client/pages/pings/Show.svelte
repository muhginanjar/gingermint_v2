<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import type { ChatLine, Person, PingThread } from '../../../shared/models'
  import type { SharedPageProps } from '../../../shared/types'
  import AppShell from '../../components/AppShell.svelte'
  import ChatRoom from '../../components/ChatRoom.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import { cn } from '../../lib/cn'

  let { thread, threads }: { thread: { id: number; participants: Person[]; messages: ChatLine[] }; threads: PingThread[] } = $props()

  const page = usePage<SharedPageProps>()
  const others = $derived(thread.participants.filter((p) => p.id !== page.props.auth.user?.id))
  const names = $derived(others.map((p) => p.name).join(', ') || 'Just you')
</script>

<AppShell tint="global" title={`Ping: ${names}`} crumbs={[{ label: 'Pings', href: '/pings' }, { label: names }]} wide>
  <div class="grid gap-4 lg:grid-cols-[260px_1fr]">
    <aside class="hidden rounded-xl border bg-card p-2 shadow-sm lg:block" aria-label="Conversations">
      {#each threads as t (t.id)}
        <Link href={`/pings/${t.id}`} class={cn('flex items-center gap-2 rounded-md px-2 py-2 text-sm text-foreground no-underline hover:bg-muted', t.id === thread.id && 'bg-accent')}>
          <Avatar person={t.participants[0] ?? null} size={26} />
          <span class={cn('min-w-0 flex-1 truncate', t.unread && 'font-bold')}>{t.participants.map((p) => p.name.split(' ')[0]).join(', ')}</span>
          {#if t.unread}<span class="h-2 w-2 rounded-full bg-ginger"></span>{/if}
        </Link>
      {/each}
    </aside>
    <section class="rounded-xl border bg-card px-4 pb-4 pt-4 shadow-sheet sm:px-6">
      <header class="mb-2 flex items-center gap-3 border-b pb-3">
        {#each others.slice(0, 3) as p (p.id)}<Avatar person={p} size={36} />{/each}
        <div class="min-w-0">
          <h1 class="truncate text-lg font-black">{names}</h1>
          <p class="text-xs text-muted-foreground">{others.map((p) => p.title).filter(Boolean).join(' · ') || 'Private ping'}</p>
        </div>
      </header>
      {#key thread.id}
        <ChatRoom initial={thread.messages} base={`/pings/${thread.id}/messages`} reactType="ping_message" reactEndpoint={(lineId) => `/pings/${thread.id}/messages/${lineId}/react`} placeholder={`Ping ${others[0]?.name.split(' ')[0] ?? ''}…`} />
      {/key}
    </section>
  </div>
</AppShell>
