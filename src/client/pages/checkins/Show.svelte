<script lang="ts">
  /** A check-in question: your answer for the latest round + everyone's answers grouped by date. */
  import { Link, router, usePage } from '@inertiajs/svelte'
  import type { CheckinAnswer, CheckinQuestion, Person, ProjectRef } from '../../../shared/models'
  import type { SharedPageProps } from '../../../shared/types'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Reactions from '../../components/Reactions.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import * as icons from '../../lib/icons'
  import { scheduleLabel } from '../../lib/checkins'
  import { formatDay, relativeTime } from '../../lib/time'

  let {
    project,
    question,
    answers,
    myAnswerId,
    askedOn,
    people,
  }: { project: ProjectRef; question: CheckinQuestion; answers: CheckinAnswer[]; myAnswerId: number | null; askedOn: string; people: Person[] } = $props()

  const page = usePage<SharedPageProps>()
  const mine = $derived(answers.find((a) => a.id === myAnswerId) ?? null)
  let body = $state('')
  let editing = $state(false)

  $effect(() => {
    body = mine?.body ?? ''
    editing = !mine
  })

  const byDate = $derived.by(() => {
    const m = new Map<string, CheckinAnswer[]>()
    for (const a of answers) m.set(a.askedOn, [...(m.get(a.askedOn) ?? []), a])
    return [...m.entries()]
  })

  const submit = () => router.post(`/projects/${project.id}/checkins/${question.id}/answers`, { body }, { preserveScroll: true, onSuccess: () => (editing = false) })
</script>

<ProjectShell {project} tool="checkins" title={question.question} crumbs={[{ label: question.question }]}>
  <div class="mx-auto max-w-3xl">
    <div class="mb-6 flex items-start gap-3">
      <Link href={`/projects/${project.id}/checkins`} class="mt-2 text-muted-foreground hover:text-foreground" aria-label="Back to check-ins"><Icon icon={icons.ArrowLeft} /></Link>
      <div class="flex-1">
        <h1 class="text-3xl font-black tracking-tight">{question.question}</h1>
        <p class="mt-1 text-sm text-muted-foreground">{question.paused ? 'Paused' : `Asking ${scheduleLabel(question)}`} · started by {question.createdBy?.name ?? 'someone'}</p>
      </div>
      <Button variant="outline" size="sm" href={`/projects/${project.id}/checkins/${question.id}/edit`}><Icon icon={icons.Pencil} /> Edit</Button>
      <Button variant="ghost" size="sm" class="text-destructive" onclick={() => confirm('Stop asking and delete all answers?') && router.delete(`/projects/${project.id}/checkins/${question.id}`)}><Icon icon={icons.Trash} /></Button>
    </div>

    <section class="rounded-lg border bg-amber-50/60 p-4 dark:bg-amber-950/20">
      <p class="mb-2 flex items-center gap-2 text-sm font-bold"><Avatar person={page.props.auth.user} size={22} /> Your answer for {formatDay(askedOn)}</p>
      {#if editing}
        <RichEditor bind:value={body} {people} projectId={project.id} rows={4} placeholder="Type your answer…" onsubmit={submit} />
        <div class="mt-2 flex gap-2">
          <Button onclick={submit} disabled={!body.trim()}>{mine ? 'Save my answer' : 'Post my answer'}</Button>
          {#if mine}<Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button>{/if}
        </div>
      {:else if mine}
        <RichText body={mine.body} />
        <button type="button" class="mt-2 text-xs text-link underline" onclick={() => (editing = true)}>Edit my answer</button>
      {/if}
    </section>

    {#each byDate as [date, list] (date)}
      <section class="mt-8">
        <h2 class="mb-3 border-b pb-1 text-sm font-bold">{formatDay(date)} <span class="font-normal text-muted-foreground">· {list.length} {list.length === 1 ? 'answer' : 'answers'}</span></h2>
        <ul class="grid gap-5">
          {#each list as a (a.id)}
            <li class="flex gap-3">
              <Avatar person={a.author} size={34} />
              <div class="min-w-0 flex-1">
                <p class="text-sm"><span class="font-semibold">{a.author?.name ?? 'Someone'}</span> <span class="text-muted-foreground">{relativeTime(a.createdAt)}</span></p>
                <RichText body={a.body} class="mt-1" />
                <div class="mt-1.5 flex items-center gap-3">
                  <Reactions type="checkin_answer" id={a.id} reactions={a.reactions} compact />
                  <Link href={`/projects/${project.id}/checkins/answers/${a.id}`} class="text-xs text-muted-foreground hover:underline">{a.commentCount ? `${a.commentCount} comments` : 'Comment'}</Link>
                </div>
              </div>
            </li>
          {/each}
        </ul>
      </section>
    {:else}
      <p class="mt-10 text-center text-sm text-muted-foreground">No answers yet.</p>
    {/each}
  </div>
</ProjectShell>
