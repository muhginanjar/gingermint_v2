<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { CheckinQuestion, ProjectRef } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Select from '../../components/ui/Select.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import { cn } from '../../lib/cn'
  import { DAY_SHORT, scheduleLabel } from '../../lib/checkins'

  let { project, question, errors = {} }: { project: ProjectRef; question: CheckinQuestion | null; errors?: Record<string, string> } = $props()

  let form = $state({
    question: question?.question ?? '',
    frequency: question?.frequency ?? 'weekly',
    days: question?.days ?? [1],
    timeOfDay: question?.timeOfDay ?? '09:00',
    paused: question?.paused ?? false,
  })

  const toggleDay = (d: number) => (form.days = form.days.includes(d) ? form.days.filter((x) => x !== d) : [...form.days, d].sort())

  function submit(e: SubmitEvent) {
    e.preventDefault()
    if (question) router.patch(`/projects/${project.id}/checkins/${question.id}`, form)
    else router.post(`/projects/${project.id}/checkins`, form)
  }
</script>

<ProjectShell {project} tool="checkins" title={question ? 'Edit check-in' : 'New check-in'} crumbs={[{ label: question ? 'Edit' : 'New question' }]}>
  <form onsubmit={submit} class="mx-auto grid max-w-2xl gap-5">
    <SheetHeader title={question ? 'Edit this check-in' : 'Ask a question on a schedule'} />
    <Field id="q" label="What do you want to ask?" error={errors.question}>
      <Input id="q" bind:value={form.question} placeholder="What did you work on today?" class="h-11 text-lg" />
    </Field>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field id="freq" label="How often?" error={errors.frequency}>
        <Select id="freq" bind:value={form.frequency} options={[
          { value: 'daily', label: 'Every weekday' },
          { value: 'weekly', label: 'Every week' },
          { value: 'biweekly', label: 'Every other week' },
          { value: 'monthly', label: 'Once a month' },
        ]} />
      </Field>
      <Field id="tod" label="At what time?" error={errors.timeOfDay}><Input id="tod" type="time" bind:value={form.timeOfDay} /></Field>
    </div>
    {#if form.frequency !== 'daily'}
      <Field label={form.frequency === 'monthly' ? 'On the first…' : 'On which days?'} error={errors.days}>
        <div class="flex flex-wrap gap-1.5" role="group" aria-label="Days">
          {#each DAY_SHORT as d, i (d)}
            <button type="button" aria-pressed={form.days.includes(i)} onclick={() => (form.frequency === 'monthly' ? (form.days = [i]) : toggleDay(i))} class={cn('h-9 w-12 rounded-md border text-sm font-medium', form.days.includes(i) ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted')}>{d}</button>
          {/each}
        </div>
      </Field>
    {/if}
    <p class="rounded-md bg-muted/60 px-3 py-2 text-sm">Everyone on the team gets asked <strong>{scheduleLabel(form)}</strong> in New for You.</p>
    {#if question}<label class="flex items-center gap-2 text-sm"><Switch bind:checked={form.paused} label="Paused" /> Pause this check-in</label>{/if}
    <div class="flex gap-2">
      <Button type="submit" disabled={!form.question.trim()}>{question ? 'Save changes' : 'Start asking'}</Button>
      <Button variant="ghost" href={`/projects/${project.id}/checkins`}>Cancel</Button>
    </div>
  </form>
</ProjectShell>
