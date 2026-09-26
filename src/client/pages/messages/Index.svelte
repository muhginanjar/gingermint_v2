<script lang="ts">
  /** Message Board: pinned first, filter by category, live text filter. */
  import { Link } from '@inertiajs/svelte'
  import type { Message, ProjectRef } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import EmptyState from '../../components/ui/EmptyState.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { toPlainText } from '../../../shared/markdown'
  import { formatDate } from '../../lib/time'

  let { project, messages, categories }: { project: ProjectRef; messages: Message[]; categories: string[] } = $props()

  let filter = $state('')
  let category = $state('')
  const isClient = $derived(project.myRole === 'client')
  const shown = $derived(
    messages
      .filter((m) => !category || m.category === category)
      .filter((m) => !filter.trim() || `${m.title} ${m.body} ${m.author?.name ?? ''}`.toLowerCase().includes(filter.trim().toLowerCase())),
  )
</script>

<ProjectShell {project} tool="message_board">
  <SheetHeader title="Message Board" center>
    {#snippet actions()}
      {#if !isClient}<Button href={`/projects/${project.id}/messages/new`}><Icon icon={icons.Plus} /> New message</Button>{/if}
    {/snippet}
    {#snippet controls()}
      <input bind:value={filter} placeholder="Filter messages…" aria-label="Filter messages" class="h-8 w-48 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {#if categories.length}
        <div class="flex flex-wrap gap-1">
          <button type="button" onclick={() => (category = '')} class={cn('rounded-full px-2.5 py-1 text-xs font-medium', !category ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent')}>All</button>
          {#each categories as c (c)}
            <button type="button" onclick={() => (category = c)} class={cn('rounded-full px-2.5 py-1 text-xs font-medium', category === c ? 'bg-foreground text-background' : 'bg-muted hover:bg-accent')}>{c}</button>
          {/each}
        </div>
      {/if}
    {/snippet}
  </SheetHeader>

  {#if messages.length === 0}
    <EmptyState icon={icons.Megaphone} title="No messages yet">
      Post announcements, pitch ideas, progress updates — discussions stay attached to their topic.
    </EmptyState>
  {:else}
    <ul class="mx-auto max-w-3xl divide-y">
      {#each shown as m (m.id)}
        <li>
          <Link href={`/projects/${project.id}/messages/${m.id}`} class="flex gap-3 py-4 text-foreground no-underline hover:bg-muted/40 sm:-mx-3 sm:rounded-md sm:px-3">
            <Avatar person={m.author} size={40} />
            <div class="min-w-0 flex-1">
              <p class="flex flex-wrap items-center gap-2">
                {#if m.pinned}<Icon icon={icons.Pin} size={14} class="text-ginger" label="Pinned" />{/if}
                {#if m.category}<span class="rounded bg-muted px-1.5 py-0.5 text-[11px] font-semibold">{m.category}</span>{/if}
                <span class="font-bold">{m.title}</span>
                {#if m.clientVisible && !isClient}<span class="rounded bg-amber-100 px-1.5 py-0.5 text-[11px] font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">The client sees this</span>{/if}
              </p>
              <p class="mt-0.5 line-clamp-2 text-sm text-muted-foreground">
                <span class="text-ginger">{m.author?.name ?? 'Someone'} · {formatDate(m.createdAt)}</span> — {toPlainText(m.body, 220)}
              </p>
            </div>
            {#if m.commentCount}
              <span class="flex h-6 min-w-6 shrink-0 items-center justify-center rounded-full bg-sky-600 px-1.5 text-xs font-bold text-white" title={`${m.commentCount} comments`}>{m.commentCount}</span>
            {/if}
          </Link>
        </li>
      {:else}
        <li class="py-8 text-center text-sm text-muted-foreground">No messages match.</li>
      {/each}
    </ul>
  {/if}
</ProjectShell>
