<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { CalendarEvent, Person, ProjectRef } from '../../../shared/models'
  import PeoplePicker from '../../components/PeoplePicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import { ymd } from '../../lib/time'

  let {
    project,
    event,
    date,
    people,
    errors = {},
  }: { project: ProjectRef; event: CalendarEvent | null; date: string | null; people: Person[]; errors?: Record<string, string> } = $props()

  const pad = (n: number) => String(n).padStart(2, '0')
  const toLocalInput = (iso: string) => {
    const d = new Date(iso)
    return `${ymd(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const day = date ?? ymd(new Date())

  let allDay = $state(event?.allDay ?? false)
  let form = $state({
    title: event?.title ?? '',
    notes: event?.notes ?? '',
    startDate: event?.allDay ? event.startsAt : day,
    endDate: event?.allDay ? event.endsAt : day,
    start: event && !event.allDay ? toLocalInput(event.startsAt) : `${day}T10:00`,
    end: event && !event.allDay ? toLocalInput(event.endsAt) : `${day}T11:00`,
    videoUrl: event?.videoUrl ?? '',
    location: event?.location ?? '',
    clientVisible: event?.clientVisible ?? false,
    participantIds: event?.participants.map((p) => p.id) ?? [],
  })

  function submit(e: SubmitEvent) {
    e.preventDefault()
    const payload = {
      title: form.title,
      notes: form.notes,
      allDay,
      startsAt: allDay ? form.startDate : new Date(form.start).toISOString(),
      endsAt: allDay ? form.endDate || form.startDate : new Date(form.end).toISOString(),
      videoUrl: form.videoUrl,
      location: form.location,
      clientVisible: form.clientVisible,
      participantIds: form.participantIds,
    }
    if (event) router.patch(`/projects/${project.id}/schedule/${event.id}`, payload)
    else router.post(`/projects/${project.id}/schedule`, payload)
  }
</script>

<ProjectShell {project} tool="schedule" title={event ? 'Edit event' : 'New event'} crumbs={[{ label: event ? 'Edit event' : 'New event' }]}>
  <form onsubmit={submit} class="mx-auto grid max-w-2xl gap-5">
    <SheetHeader title={event ? 'Edit event' : 'New event'} />
    <Field id="ev-title" label="What's happening?" error={errors.title}><Input id="ev-title" bind:value={form.title} class="h-11 text-lg font-semibold" placeholder="e.g. Kickoff with the client" /></Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={allDay} label="All day" /> All-day event</label>
    {#if allDay}
      <div class="grid gap-4 sm:grid-cols-2">
        <Field id="ev-sd" label="Starts" error={errors.startsAt}><Input id="ev-sd" type="date" bind:value={form.startDate} /></Field>
        <Field id="ev-ed" label="Ends" error={errors.endsAt}><Input id="ev-ed" type="date" bind:value={form.endDate} /></Field>
      </div>
    {:else}
      <div class="grid gap-4 sm:grid-cols-2">
        <Field id="ev-s" label="Starts" error={errors.startsAt}><Input id="ev-s" type="datetime-local" bind:value={form.start} /></Field>
        <Field id="ev-e" label="Ends" error={errors.endsAt}><Input id="ev-e" type="datetime-local" bind:value={form.end} /></Field>
      </div>
    {/if}
    <Field id="ev-people" label="Who's invited?" hint="They'll get a notification and a reminder 15 minutes before."><PeoplePicker {people} bind:selected={form.participantIds} id="ev-people" /></Field>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field id="ev-video" label="Video call link" error={errors.videoUrl} hint="Zoom, Meet, Teams… shows a Join button."><Input id="ev-video" bind:value={form.videoUrl} placeholder="https://zoom.us/j/…" /></Field>
      <Field id="ev-loc" label="Location"><Input id="ev-loc" bind:value={form.location} placeholder="Room, address…" /></Field>
    </div>
    <Field label="Notes"><RichEditor bind:value={form.notes} {people} projectId={project.id} rows={5} minimal /></Field>
    <label class="flex items-center gap-2 text-sm"><Switch bind:checked={form.clientVisible} label="Visible to clients" /> The client sees this</label>
    <div class="flex gap-2">
      <Button type="submit" disabled={!form.title.trim()}>{event ? 'Save changes' : 'Post this event'}</Button>
      <Button variant="ghost" href={event ? `/projects/${project.id}/schedule/${event.id}` : `/projects/${project.id}/schedule`}>Cancel</Button>
    </div>
  </form>
</ProjectShell>
