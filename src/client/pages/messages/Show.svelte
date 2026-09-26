<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Comment, Message, Person, ProjectRef } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Reactions from '../../components/Reactions.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import * as icons from '../../lib/icons'
  import { formatDateTime } from '../../lib/time'

  let {
    project,
    message,
    comments,
    subscribed,
    bookmarked,
    people,
    canEdit,
  }: { project: ProjectRef; message: Message; comments: Comment[]; subscribed: boolean; bookmarked: boolean; people: Person[]; canEdit: boolean } = $props()

  const isClient = $derived(project.myRole === 'client')
</script>

<ProjectShell {project} tool="message_board" title={message.title} crumbs={[{ label: message.title }]}>
  <article class="mx-auto max-w-3xl">
    <RecordBar backHref={`/projects/${project.id}/messages`} backLabel="Message Board" type="message" id={message.id} title={message.title} context={project.name} {bookmarked} {subscribed}>
      {#snippet menu({ close })}
        {#if !isClient}
          <MenuItem icon={message.pinned ? icons.PinOff : icons.Pin} onclick={() => { close(); router.post(`/projects/${project.id}/messages/${message.id}/pin`, { pinned: !message.pinned }, { preserveScroll: true }) }}>{message.pinned ? 'Unpin' : 'Pin to the top'}</MenuItem>
        {/if}
        {#if canEdit}
          <MenuItem href={`/projects/${project.id}/messages/${message.id}/edit`} icon={icons.Pencil}>Edit</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this message and its comments?') && router.delete(`/projects/${project.id}/messages/${message.id}`) }}>Delete</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>

    <header class="text-center">
      {#if message.category}<p class="mb-1 text-xs font-bold uppercase tracking-wide text-ginger">{message.category}</p>{/if}
      <h1 class="text-3xl font-black tracking-tight sm:text-4xl">{message.title}</h1>
      <p class="mt-3 flex items-center justify-center gap-2 text-sm text-muted-foreground">
        <Avatar person={message.author} size={24} /> {message.author?.name ?? 'Someone'} · {formatDateTime(message.createdAt)}
      </p>
      {#if message.clientVisible && !isClient}<p class="mt-2 inline-block rounded bg-amber-100 px-2 py-0.5 text-xs font-semibold text-amber-900 dark:bg-amber-900/40 dark:text-amber-200">The client sees this</p>{/if}
    </header>

    <RichText body={message.body} class="mt-8" />
    <div class="mt-6"><Reactions type="message" id={message.id} reactions={message.reactions} /></div>

    <CommentThread type="message" id={message.id} {comments} {people} projectId={project.id} />
  </article>
</ProjectShell>
