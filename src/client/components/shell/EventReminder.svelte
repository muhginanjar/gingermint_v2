<script lang="ts">
  /** Upcoming-event reminder: polls for events starting within 15 minutes; one-click Join. */
  import type { CalendarEvent } from '../../../shared/models'
  import { api } from '../../lib/api'
  import * as icons from '../../lib/icons'
  import { formatTime } from '../../lib/time'
  import Button from '../ui/Button.svelte'
  import Icon from '../ui/Icon.svelte'

  let events = $state<CalendarEvent[]>([])
  let dismissed = $state<number[]>([])
  let now = $state(Date.now())

  function readDismissed(): number[] {
    try {
      return JSON.parse(sessionStorage.getItem('gm:dismissed-reminders') ?? '[]')
    } catch {
      return []
    }
  }

  async function poll() {
    try {
      events = (await api.get<{ events: CalendarEvent[] }>('/calendar/reminders')).events
    } catch {
      /* ignore */
    }
    now = Date.now()
  }

  $effect(() => {
    dismissed = readDismissed()
    void poll()
    const t = setInterval(poll, 60_000)
    const tick = setInterval(() => (now = Date.now()), 20_000)
    return () => {
      clearInterval(t)
      clearInterval(tick)
    }
  })

  function dismiss(id: number) {
    dismissed = [...dismissed, id]
    try {
      sessionStorage.setItem('gm:dismissed-reminders', JSON.stringify(dismissed))
    } catch {
      /* private mode */
    }
  }

  const visible = $derived(events.filter((e) => !dismissed.includes(e.id)).slice(0, 2))
  const minutes = (iso: string) => Math.max(0, Math.round((Date.parse(iso) - now) / 60_000))
</script>

<div class="fixed right-3 top-16 z-[60] flex w-[320px] max-w-[calc(100vw-24px)] flex-col gap-2" aria-live="polite">
  {#each visible as e (e.id)}
    <div class="rounded-lg border bg-card p-3 shadow-xl animate-[slide-up_160ms_ease]">
      <div class="flex items-start gap-2">
        <span class="mt-0.5 rounded-full bg-ginger-soft p-1.5 text-ginger"><Icon icon={icons.AlarmClock} size={14} /></span>
        <div class="min-w-0 flex-1">
          <p class="text-xs font-semibold text-ginger">
            {minutes(e.startsAt) === 0 ? 'Starting now' : `Starts in ${minutes(e.startsAt)} min`} · {formatTime(e.startsAt)}
          </p>
          <a href={`/projects/${e.projectId}/schedule/${e.id}`} class="block truncate font-semibold hover:underline">{e.title}</a>
          <p class="truncate text-xs text-muted-foreground">{e.projectName}{e.location ? ` · ${e.location}` : ''}</p>
        </div>
        <button type="button" class="rounded p-1 text-muted-foreground hover:text-foreground" aria-label="Dismiss reminder" onclick={() => dismiss(e.id)}>
          <Icon icon={icons.X} size={14} />
        </button>
      </div>
      {#if e.videoUrl}
        <Button href={e.videoUrl} external size="sm" class="mt-2 w-full" target="_blank" rel="noopener noreferrer">
          <Icon icon={icons.Video} /> Join the call
        </Button>
      {/if}
    </div>
  {/each}
</div>
