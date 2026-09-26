<script lang="ts">
  /** One line of activity: "Janet M. commented on <Title> — Project". */
  import { Link } from '@inertiajs/svelte'
  import type { IconNode } from 'lucide'
  import type { Activity } from '../../shared/models'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { shortAgo } from '../lib/time'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'

  let { activity: a, compact = false, showProject = true }: { activity: Activity; compact?: boolean; showProject?: boolean } = $props()

  const STYLE: Record<string, { icon: IconNode; tone: string }> = {
    message: { icon: icons.Megaphone, tone: 'bg-sky-500' },
    todo: { icon: icons.Check, tone: 'bg-green-600' },
    todo_list: { icon: icons.ListChecks, tone: 'bg-green-600' },
    card: { icon: icons.SquareKanban, tone: 'bg-orange-500' },
    doc: { icon: icons.FileText, tone: 'bg-violet-500' },
    file: { icon: icons.File, tone: 'bg-violet-500' },
    link: { icon: icons.Link, tone: 'bg-violet-500' },
    folder: { icon: icons.Folder, tone: 'bg-violet-500' },
    event: { icon: icons.CalendarDays, tone: 'bg-pink-500' },
    chat_line: { icon: icons.MessagesSquare, tone: 'bg-teal-500' },
    checkin_answer: { icon: icons.MessageCircleQuestionMark, tone: 'bg-amber-500' },
    checkin_question: { icon: icons.MessageCircleQuestionMark, tone: 'bg-amber-500' },
    project: { icon: icons.Star, tone: 'bg-yellow-500' },
    time_entry: { icon: icons.Timer, tone: 'bg-stone-500' },
    forward: { icon: icons.Forward, tone: 'bg-stone-500' },
  }
  const s = $derived(a.action === 'commented' ? { icon: icons.MessageCircle, tone: 'bg-sky-500' } : (STYLE[a.recordableType] ?? { icon: icons.Circle, tone: 'bg-stone-400' }))
</script>

<div class={cn('flex gap-2.5', compact ? 'text-[13px]' : 'text-sm')}>
  <span class={cn('mt-0.5 flex shrink-0 items-center justify-center rounded-full text-white', s.tone, compact ? 'h-4 w-4' : 'h-5 w-5')}>
    <Icon icon={s.icon} size={compact ? 9 : 11} strokeWidth={3} />
  </span>
  <div class="min-w-0 flex-1">
    {#if compact}<p class="text-xs text-muted-foreground">{shortAgo(a.createdAt)}</p>{/if}
    <p class="leading-snug">
      {#if !compact}<Avatar person={a.actor} size={18} class="mr-1 align-[-4px]" />{/if}
      <span class="font-semibold">{a.actor?.name ?? 'Someone'}</span>
      {a.action}
      {#if a.recordableType !== 'project'}
        <Link href={a.url} class="font-semibold text-link underline decoration-link/30 underline-offset-2 hover:decoration-link">{a.title}</Link>
      {:else}
        <Link href={a.url} class="font-semibold text-link hover:underline">{a.title}</Link>
      {/if}
      {#if showProject && a.projectName && a.recordableType !== 'project'}<span class="text-muted-foreground"> — {a.projectName}</span>{/if}
    </p>
    {#if a.excerpt && !compact}<p class="mt-0.5 line-clamp-2 text-muted-foreground">{a.excerpt}</p>{/if}
  </div>
  {#if !compact}<span class="shrink-0 text-xs text-muted-foreground">{shortAgo(a.createdAt)}</span>{/if}
</div>
