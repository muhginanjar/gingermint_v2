<script lang="ts">
  /** Global calendar: all projects or one, Mine / Everyone, Events or Events + tasks, ICS subscribe. */
  import { router } from '@inertiajs/svelte'
  import type { CalendarEntry, Color } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import CalendarView from '../../components/CalendarView.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Select from '../../components/ui/Select.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import * as icons from '../../lib/icons'
  import { toast } from '../../lib/state.svelte'

  let {
    entries,
    query,
    projects,
    feedUrl,
  }: {
    entries: CalendarEntry[]
    query: { from: string; days: number; projectId: number | null; who: string; include: string }
    projects: { id: number; name: string; color: Color }[]
    feedUrl: string
  } = $props()

  let project = $state<string | number>(query.projectId ?? '')
  let who = $state(query.who)
  let include = $state(query.include)
  let subscribe = $state(false)

  function apply() {
    const params = new URLSearchParams({ from: query.from, weeks: String(Math.round(query.days / 7)), who, include })
    if (project) params.set('project', String(project))
    router.get(`/calendar?${params}`, {}, { preserveScroll: true })
  }
</script>

<AppShell tint="global" title="Calendar" crumbs={[{ label: 'Calendar' }]}>
  <Sheet>
    <SheetHeader title="Calendar">
      {#snippet actions()}
        <Button variant="outline" size="sm" onclick={() => (subscribe = true)}><Icon icon={icons.CalendarClock} /> Subscribe</Button>
      {/snippet}
      {#snippet controls()}
        <Select bind:value={project} onchange={apply} options={[{ value: '', label: 'All projects' }, ...projects.map((p) => ({ value: p.id, label: p.name }))]} class="h-8 w-52" aria-label="Project" />
        <Tabs items={[{ value: 'everyone', label: 'Everyone' }, { value: 'mine', label: 'Mine' }]} bind:value={who} onchange={apply} label="Whose" />
        <Tabs items={[{ value: 'events', label: 'Events' }, { value: 'events_tasks', label: 'Events + tasks' }]} bind:value={include} onchange={apply} label="Include" />
      {/snippet}
    </SheetHeader>
    <CalendarView {entries} from={query.from} weeks={Math.round(query.days / 7) || 6} query={{ project: project || null, who, include }} />
  </Sheet>
</AppShell>

<Dialog bind:open={subscribe} title="Subscribe to your calendar" description="Add this private link to Google Calendar, Apple Calendar or Outlook (as “From URL”). It includes events and your dated assignments.">
  <div class="flex gap-2">
    <Input value={feedUrl} readonly aria-label="Calendar feed URL" class="font-mono text-xs" />
    <Button variant="outline" onclick={async () => { await navigator.clipboard?.writeText(feedUrl); toast('Copied.') }}><Icon icon={icons.Copy} /> Copy</Button>
  </div>
  <p class="text-xs text-muted-foreground">Anyone with this link can see your calendar. <button type="button" class="underline" onclick={() => confirm('Create a new link? The old one stops working.') && router.post('/calendar/rotate')}>Reset it</button> if it leaks.</p>
</Dialog>
