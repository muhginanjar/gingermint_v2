<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { CalendarEvent, Comment, Person, ProjectRef } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import { colorOf } from '../../lib/colors'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { formatDay, formatTime, localDate } from '../../lib/time'

  let {
    project,
    event,
    comments,
    subscribed,
    bookmarked,
    people,
  }: { project: ProjectRef; event: CalendarEvent; comments: Comment[]; subscribed: boolean; bookmarked: boolean; people: Person[] } = $props()

  const isClient = $derived(project.myRole === 'client')
  const when = $derived.by(() => {
    if (event.allDay) {
      const s = formatDay(event.startsAt)
      return event.endsAt !== event.startsAt ? `${s} – ${formatDay(event.endsAt)} · All day` : `${s} · All day`
    }
    const sameDay = localDate(event.startsAt).toDateString() === localDate(event.endsAt).toDateString() || new Date(event.startsAt).toDateString() === new Date(event.endsAt).toDateString()
    return sameDay
      ? `${formatDay(event.startsAt)} · ${formatTime(event.startsAt)} – ${formatTime(event.endsAt)}`
      : `${formatDay(event.startsAt)} ${formatTime(event.startsAt)} – ${formatDay(event.endsAt)} ${formatTime(event.endsAt)}`
  })
</script>

<ProjectShell {project} tool="schedule" title={event.title} crumbs={[{ label: event.title }]}>
  <article class="mx-auto max-w-3xl">
    <RecordBar backHref={`/projects/${project.id}/schedule`} backLabel="Schedule" type="event" id={event.id} title={event.title} context={project.name} {bookmarked} {subscribed}>
      {#snippet menu({ close })}
        {#if !isClient}
          <MenuItem href={`/projects/${project.id}/schedule/${event.id}/edit`} icon={icons.Pencil}>Edit</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this event?') && router.delete(`/projects/${project.id}/schedule/${event.id}`) }}>Delete</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>
    <div class="flex gap-4">
      <span class={cn('mt-2 h-3 w-3 shrink-0 rounded-full', colorOf(event.projectColor).dot)}></span>
      <div class="min-w-0 flex-1">
        <h1 class="text-3xl font-black tracking-tight">{event.title}</h1>
        <p class="mt-2 flex items-center gap-2 font-semibold"><Icon icon={icons.CalendarDays} class="text-muted-foreground" />{when}</p>
        {#if event.location}<p class="mt-1 flex items-center gap-2 text-sm"><Icon icon={icons.MapPin} class="text-muted-foreground" />{event.location}</p>{/if}
        {#if event.videoUrl}
          <Button href={event.videoUrl} external target="_blank" rel="noopener noreferrer" class="mt-3"><Icon icon={icons.Video} /> Join the call</Button>
        {/if}
        {#if event.participants.length}
          <div class="mt-4">
            <p class="text-sm font-bold">Who's coming</p>
            <ul class="mt-1 flex flex-wrap gap-3">{#each event.participants as p (p.id)}<li class="flex items-center gap-1.5 text-sm"><Avatar person={p} size={22} />{p.name}</li>{/each}</ul>
          </div>
        {/if}
        {#if event.notes}<RichText body={event.notes} class="mt-6" />{/if}
        <p class="mt-6 text-xs text-muted-foreground">Added by {event.createdBy?.name ?? 'someone'}</p>
      </div>
    </div>
    <CommentThread type="event" id={event.id} {comments} {people} projectId={project.id} />
  </article>
</ProjectShell>
