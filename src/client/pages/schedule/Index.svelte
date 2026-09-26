<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { CalendarEntry, ProjectRef } from '../../../shared/models'
  import CalendarView from '../../components/CalendarView.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'

  let { project, entries, query }: { project: ProjectRef; entries: CalendarEntry[]; query: { from: string; days: number; who: string; include: string } } = $props()

  let who = $state(query.who)
  let include = $state(query.include)
  const apply = () => router.get(`/projects/${project.id}/schedule?${new URLSearchParams({ from: query.from, weeks: String(Math.round(query.days / 7)), who, include })}`, {}, { preserveScroll: true })
</script>

<ProjectShell {project} tool="schedule">
  <SheetHeader title="Schedule" center>
    {#snippet controls()}
      <Tabs items={[{ value: 'everyone', label: 'Everyone' }, { value: 'mine', label: 'Mine' }]} bind:value={who} onchange={apply} label="Whose" />
      <Tabs items={[{ value: 'events', label: 'Events' }, { value: 'events_tasks', label: 'Events + tasks' }]} bind:value={include} onchange={apply} label="Include" />
    {/snippet}
  </SheetHeader>
  <CalendarView {entries} from={query.from} weeks={Math.round(query.days / 7) || 6} showProject={false} newEventHref={project.myRole === 'client' ? undefined : `/projects/${project.id}/schedule/new`} query={{ who, include }} />
</ProjectShell>
