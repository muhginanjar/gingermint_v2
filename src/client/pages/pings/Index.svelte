<script lang="ts">
  /** Pings: all your private conversations + start a new one. */
  import { Link } from '@inertiajs/svelte'
  import type { Person, PingThread } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import EmptyState from '../../components/ui/EmptyState.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { ui } from '../../lib/state.svelte'
  import { shortAgo } from '../../lib/time'

  let { threads, people }: { threads: PingThread[]; people: Person[] } = $props()
</script>

<AppShell tint="global" title="Pings" crumbs={[{ label: 'Pings' }]}>
  <Sheet class="mx-auto max-w-3xl">
    <SheetHeader title="Pings" subtitle="Private conversations with one person or a small group.">
      {#snippet actions()}<Button onclick={() => (ui.pingOpen = true)}><Icon icon={icons.Plus} /> New ping</Button>{/snippet}
    </SheetHeader>
    {#if threads.length}
      <ul class="divide-y">
        {#each threads as t (t.id)}
          <li>
            <Link href={`/pings/${t.id}`} class="flex items-center gap-3 py-3 text-foreground no-underline hover:bg-muted/40 sm:-mx-3 sm:rounded-md sm:px-3">
              <Avatar person={t.participants[0] ?? null} size={40} />
              <div class="min-w-0 flex-1">
                <p class={cn('truncate', t.unread ? 'font-bold' : 'font-semibold')}>{t.participants.map((p) => p.name).join(', ') || 'Just you'}</p>
                <p class="truncate text-sm text-muted-foreground">{#if t.lastMessage}{t.lastMessage.authorName.split(' ')[0]}: {t.lastMessage.body}{/if}</p>
              </div>
              <span class="shrink-0 text-xs text-muted-foreground">{shortAgo(t.updatedAt)}</span>
              {#if t.unread}<span class="rounded-full bg-ginger px-1.5 text-xs font-bold text-white">{t.unread}</span>{/if}
            </Link>
          </li>
        {/each}
      </ul>
    {:else}
      <EmptyState icon={icons.MessageCircle} title="No pings yet">Start a private conversation — it stays out of every project.</EmptyState>
    {/if}
    <h2 class="mt-10 text-sm font-bold uppercase tracking-wide text-muted-foreground">Everyone</h2>
    <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
      {#each people as p (p.id)}
        <Link href={`/people/${p.id}`} class="flex items-center gap-2 rounded-md p-2 text-sm text-foreground no-underline hover:bg-muted"><Avatar person={p} size={26} /><span class="truncate">{p.name}</span></Link>
      {/each}
    </div>
  </Sheet>
</AppShell>
