<script lang="ts">
  import { Link } from '@inertiajs/svelte'
  import type { CheckinQuestion, ProjectRef } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import EmptyState from '../../components/ui/EmptyState.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import * as icons from '../../lib/icons'
  import { scheduleLabel } from '../../lib/checkins'

  let { project, questions }: { project: ProjectRef; questions: CheckinQuestion[] } = $props()
</script>

<ProjectShell {project} tool="checkins">
  <SheetHeader title="Automatic Check-ins" center subtitle="Ask the team a question on a schedule — answers collect here, no meetings required.">
    {#snippet actions()}<Button href={`/projects/${project.id}/checkins/new`}><Icon icon={icons.Plus} /> Set up a new question</Button>{/snippet}
  </SheetHeader>
  {#if questions.length}
    <ul class="mx-auto grid max-w-3xl gap-3">
      {#each questions as q (q.id)}
        <li>
          <Link href={`/projects/${project.id}/checkins/${q.id}`} class="flex items-center gap-4 rounded-lg border bg-card p-4 text-foreground no-underline shadow-sm transition-shadow hover:shadow-md">
            <span class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200"><Icon icon={icons.MessageCircleQuestionMark} /></span>
            <div class="min-w-0 flex-1">
              <p class="font-bold">{q.question}</p>
              <p class="text-sm text-muted-foreground">{q.paused ? 'Paused' : `Asking ${scheduleLabel(q)}`} · {q.answerCount} answers</p>
            </div>
            <Icon icon={icons.ChevronRight} class="text-muted-foreground" />
          </Link>
        </li>
      {/each}
    </ul>
  {:else}
    <EmptyState icon={icons.MessageCircleQuestionMark} title="No check-ins yet">
      Try “What did you work on today?” every weekday at 4pm, or “What's on your plate this week?” every Monday morning.
    </EmptyState>
  {/if}
</ProjectShell>
