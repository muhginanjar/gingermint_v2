<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { CheckinAnswer, CheckinQuestion, Comment, Person, ProjectRef } from '../../../shared/models'
  import CommentThread from '../../components/CommentThread.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Reactions from '../../components/Reactions.svelte'
  import RecordBar from '../../components/RecordBar.svelte'
  import RichEditor from '../../components/RichEditor.svelte'
  import RichText from '../../components/RichText.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import * as icons from '../../lib/icons'
  import { formatDay, formatDateTime } from '../../lib/time'

  let {
    project,
    question,
    answer,
    canEdit,
    comments,
    subscribed,
    people,
  }: { project: ProjectRef; question: CheckinQuestion; answer: CheckinAnswer; canEdit: boolean; comments: Comment[]; subscribed: boolean; people: Person[] } = $props()

  let editing = $state(false)
  let body = $state('')
</script>

<ProjectShell {project} tool="checkins" title={question.question} crumbs={[{ label: question.question, href: `/projects/${project.id}/checkins/${question.id}` }, { label: answer.author?.name ?? 'Answer' }]}>
  <article class="mx-auto max-w-3xl">
    <RecordBar backHref={`/projects/${project.id}/checkins/${question.id}`} backLabel="All answers" type="checkin_answer" id={answer.id} title={question.question} context={project.name} {subscribed}>
      {#snippet menu({ close })}
        {#if canEdit}
          <MenuItem icon={icons.Pencil} onclick={() => { close(); body = answer.body; editing = true }}>Edit</MenuItem>
          <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm('Delete this answer?') && router.delete(`/projects/${project.id}/checkins/answers/${answer.id}`) }}>Delete</MenuItem>
        {/if}
      {/snippet}
    </RecordBar>
    <p class="text-sm font-bold uppercase tracking-wide text-ginger">{formatDay(answer.askedOn)}</p>
    <h1 class="mt-1 text-2xl font-black tracking-tight">{question.question}</h1>
    <p class="mt-3 flex items-center gap-2 text-sm"><Avatar person={answer.author} size={26} /><span class="font-semibold">{answer.author?.name}</span><span class="text-muted-foreground">{formatDateTime(answer.createdAt)}</span></p>
    {#if editing}
      <div class="mt-4 grid gap-2">
        <RichEditor bind:value={body} {people} projectId={project.id} rows={5} />
        <div class="flex gap-2">
          <Button onclick={() => router.patch(`/projects/${project.id}/checkins/answers/${answer.id}`, { body }, { onSuccess: () => (editing = false) })}>Save</Button>
          <Button variant="ghost" onclick={() => (editing = false)}>Cancel</Button>
        </div>
      </div>
    {:else}
      <RichText body={answer.body} class="mt-4" />
    {/if}
    <div class="mt-4"><Reactions type="checkin_answer" id={answer.id} reactions={answer.reactions} /></div>
    <CommentThread type="checkin_answer" id={answer.id} {comments} {people} projectId={project.id} />
  </article>
</ProjectShell>
