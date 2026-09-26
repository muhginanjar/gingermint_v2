<script lang="ts">
  /**
   * A live conversation (project Chat or a Ping). Polls for new lines every
   * couple of seconds, groups by day, supports boosts, file/media attachments
   * with previews before sending, voice notes, and loading older history.
   */
  import { usePage } from '@inertiajs/svelte'
  import type { ChatLine, Person, ReactionGroup } from '../../shared/models'
  import type { SharedPageProps } from '../../shared/types'
  import { api, uploadFiles } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { toast } from '../lib/state.svelte'
  import { dayKey, formatDay, formatTime, todayYmd } from '../lib/time'
  import { formatBytes } from '../lib/files'
  import Reactions from './Reactions.svelte'
  import RichText from './RichText.svelte'
  import VoiceRecorder from './VoiceRecorder.svelte'
  import Avatar from './ui/Avatar.svelte'
  import Button from './ui/Button.svelte'
  import Icon from './ui/Icon.svelte'

  let {
    initial,
    base,
    projectId = null,
    people = [],
    canLoadOlder = false,
    reactEndpoint,
    reactType = 'chat_line',
    watchReactions = false,
    placeholder = 'Type a message…',
  }: {
    initial: ChatLine[]
    /** e.g. /projects/1/chat/lines or /pings/3/messages */
    base: string
    projectId?: number | null
    people?: Person[]
    canLoadOlder?: boolean
    reactEndpoint?: (lineId: number) => string
    reactType?: string
    watchReactions?: boolean
    placeholder?: string
  } = $props()

  const page = usePage<SharedPageProps>()
  const me = $derived(page.props.auth.user)

  let lines = $state<ChatLine[]>([...initial])
  let text = $state('')
  let pending = $state<{ file: File; url: string }[]>([])
  let sending = $state(false)
  let recording = $state(false)
  let olderDone = $state(!canLoadOlder || initial.length < 100)
  let scroller = $state<HTMLDivElement | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  let input = $state<HTMLTextAreaElement | null>(null)

  const lastId = () => lines.at(-1)?.id ?? 0
  const nearBottom = () => !scroller || scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight < 120

  function scrollToBottom(force = false) {
    if (!scroller) return
    if (force || nearBottom()) queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight))
  }

  function merge(incoming: ChatLine[]) {
    const known = new Set(lines.map((l) => l.id))
    const fresh = incoming.filter((l) => !known.has(l.id))
    if (fresh.length) {
      const stick = nearBottom()
      lines = [...lines, ...fresh]
      if (stick) scrollToBottom(true)
    }
  }

  async function poll() {
    try {
      const watch = watchReactions ? `&watch=${lines.slice(-40).map((l) => l.id).join(',')}` : ''
      const res = await api.get<{ lines: ChatLine[]; reactions?: Record<string, ReactionGroup[]> }>(`${base}?after=${lastId()}${watch}`)
      merge(res.lines)
      if (res.reactions) {
        lines = lines.map((l) => (l.id in res.reactions! ? { ...l, reactions: res.reactions![l.id] ?? [] } : watchReactions && lines.slice(-40).some((x) => x.id === l.id) ? { ...l, reactions: [] } : l))
      }
    } catch {
      /* transient */
    }
  }

  $effect(() => {
    scrollToBottom(true)
    const hash = window.location.hash.match(/^#line-(\d+)$/)
    if (hash) queueMicrotask(() => document.getElementById(`line-${hash[1]}`)?.scrollIntoView({ block: 'center' }))
    const t = setInterval(() => document.visibilityState === 'visible' && void poll(), 2500)
    return () => clearInterval(t)
  })

  async function loadOlder() {
    const first = lines[0]
    if (!first || !scroller) return
    const prevHeight = scroller.scrollHeight
    const res = await api.get<{ lines: ChatLine[] }>(`${base}?before=${first.id}`)
    if (res.lines.length < 50) olderDone = true
    lines = [...res.lines, ...lines]
    queueMicrotask(() => scroller && (scroller.scrollTop = scroller.scrollHeight - prevHeight))
  }

  async function send() {
    if (sending || (!text.trim() && !pending.length)) return
    sending = true
    try {
      const uploaded = pending.length ? await uploadFiles(pending.map((p) => p.file), projectId) : []
      const body = text
      if (!uploaded.length) {
        const res = await api.post<{ line: ChatLine }>(base, { body })
        merge([res.line])
      } else {
        for (let i = 0; i < uploaded.length; i++) {
          const res = await api.post<{ line: ChatLine }>(base, { body: i === 0 ? body : '', attachmentId: uploaded[i]?.id })
          merge([res.line])
        }
      }
      text = ''
      for (const p of pending) URL.revokeObjectURL(p.url)
      pending = []
      scrollToBottom(true)
      input?.focus()
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Could not send', 'error')
    } finally {
      sending = false
    }
  }

  async function sendVoice(blob: Blob, seconds: number, ext: string) {
    const [saved] = await uploadFiles([blob], projectId, [`voice-note.${ext}`])
    if (saved) {
      const res = await api.post<{ line: ChatLine }>(base, { body: '', attachmentId: saved.id })
      merge([res.line])
    }
    recording = false
    void seconds
  }

  function addFiles(files: File[]) {
    pending = [...pending, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) {
      e.preventDefault()
      void send()
    }
  }

  async function remove(line: ChatLine) {
    if (!confirm('Delete this line?')) return
    await api.delete(`${base}/${line.id}`)
    lines = lines.filter((l) => l.id !== line.id)
  }

  const grouped = $derived.by(() => {
    const out: { day: string; items: ChatLine[] }[] = []
    for (const l of lines) {
      const d = dayKey(l.createdAt)
      const last = out.at(-1)
      if (last && last.day === d) last.items.push(l)
      else out.push({ day: d, items: [l] })
    }
    return out
  })
</script>

<div class="flex h-[calc(100vh-15rem)] min-h-[420px] flex-col">
  <div bind:this={scroller} class="flex-1 overflow-y-auto px-1 pb-2" aria-live="polite">
    {#if !olderDone}
      <div class="py-2 text-center"><Button size="xs" variant="ghost" onclick={loadOlder}>Load earlier messages</Button></div>
    {/if}
    {#each grouped as g (g.day)}
      <div class="my-4 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
        <span class="h-px flex-1 bg-border"></span>{g.day === todayYmd() ? 'Today' : formatDay(g.day)}<span class="h-px flex-1 bg-border"></span>
      </div>
      {#each g.items as l, i (l.id)}
        {@const mine = l.author?.id === me?.id}
        {@const prev = g.items[i - 1]}
        {@const compact = prev && prev.author?.id === l.author?.id && Date.parse(l.createdAt) - Date.parse(prev.createdAt) < 5 * 60_000}
        <div id={`line-${l.id}`} class={cn('group flex gap-2.5 target:rounded-md target:bg-ginger-soft/40', mine && 'flex-row-reverse', compact ? 'mt-1' : 'mt-3')}>
          <div class="w-8 shrink-0">{#if !compact}<Avatar person={l.author} size={32} />{/if}</div>
          <div class={cn('flex min-w-0 max-w-[78%] flex-col', mine && 'items-end')}>
            {#if !compact}
              <p class={cn('mb-0.5 text-xs', mine && 'text-right')}>
                <span class="font-semibold">{mine ? 'Me' : (l.author?.name ?? 'Someone')}</span>
                <span class="text-muted-foreground">{formatTime(l.createdAt)}</span>
              </p>
            {/if}
            <div class={cn('rounded-2xl px-3 py-2 text-[15px]', mine ? 'rounded-tr-sm bg-sky-100 dark:bg-sky-900/40' : 'rounded-tl-sm bg-muted')}>
              {#if l.body}<RichText body={l.body} class="text-[15px] leading-snug [&>*+*]:mt-1" />{/if}
              {#if l.attachment}
                {#if l.attachment.kind === 'image'}
                  <a href={l.attachment.url} target="_blank" rel="noopener noreferrer" class="mt-1 block"><img src={l.attachment.url} alt={l.attachment.filename} loading="lazy" class="max-h-64 rounded-lg border object-cover" /></a>
                {:else if l.attachment.kind === 'voice'}
                  <audio controls preload="metadata" src={l.attachment.url} class="mt-1 h-10 w-64 max-w-full"></audio>
                {:else if l.attachment.kind === 'video'}
                  <video controls preload="metadata" src={l.attachment.url} class="mt-1 max-h-64 rounded-lg"><track kind="captions" /></video>
                {:else}
                  <a href={`${l.attachment.url}?download`} class="mt-1 flex items-center gap-2 rounded-md border bg-card px-3 py-2 text-sm no-underline hover:bg-muted">
                    <Icon icon={icons.File} /> <span class="truncate">{l.attachment.filename}</span> <span class="text-xs text-muted-foreground">{formatBytes(l.attachment.size)}</span>
                  </a>
                {/if}
              {/if}
            </div>
            <div class={cn('mt-0.5 flex items-center gap-1', mine && 'flex-row-reverse')}>
              <Reactions type={reactType} id={l.id} bind:reactions={l.reactions} endpoint={reactEndpoint?.(l.id)} compact />
              {#if mine && reactType === 'chat_line'}
                <button type="button" class="rounded p-1 text-muted-foreground opacity-0 hover:text-destructive group-hover:opacity-100" aria-label="Delete line" onclick={() => remove(l)}><Icon icon={icons.Trash} size={12} /></button>
              {/if}
            </div>
          </div>
        </div>
      {/each}
    {:else}
      <p class="py-16 text-center text-sm text-muted-foreground">No messages yet. Say hello 👋</p>
    {/each}
  </div>

  <div class="border-t pt-3">
    {#if recording}
      <div class="mb-2"><VoiceRecorder onattach={sendVoice} oncancel={() => (recording = false)} /></div>
    {/if}
    {#if pending.length}
      <div class="mb-2 flex flex-wrap gap-2" aria-label="Attachments to send">
        {#each pending as p, i (p.url)}
          <div class="relative">
            {#if p.file.type.startsWith('image/')}
              <img src={p.url} alt={p.file.name} class="h-16 w-16 rounded-md border object-cover" />
            {:else if p.file.type.startsWith('video/')}
              <video src={p.url} class="h-16 w-24 rounded-md border object-cover" muted><track kind="captions" /></video>
            {:else}
              <div class="flex h-16 w-32 items-center gap-1 rounded-md border bg-muted px-2 text-xs"><Icon icon={icons.File} /><span class="truncate">{p.file.name}</span></div>
            {/if}
            <button type="button" class="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-foreground text-background" aria-label={`Remove ${p.file.name}`} onclick={() => { URL.revokeObjectURL(p.url); pending = pending.filter((_, j) => j !== i) }}>
              <Icon icon={icons.X} size={11} />
            </button>
          </div>
        {/each}
      </div>
    {/if}
    <div class="flex items-end gap-2 rounded-xl border border-input bg-card p-1.5 shadow-sm focus-within:ring-2 focus-within:ring-ring">
      <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Attach files" onclick={() => fileInput?.click()}><Icon icon={icons.Paperclip} /></button>
      <button type="button" class="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Record a voice note" onclick={() => (recording = true)}><Icon icon={icons.Mic} /></button>
      <input bind:this={fileInput} type="file" multiple class="hidden" onchange={(e) => { const t = e.currentTarget as HTMLInputElement; addFiles([...(t.files ?? [])]); t.value = '' }} />
      <textarea
        bind:this={input}
        bind:value={text}
        onkeydown={onKey}
        onpaste={(e) => { const f = [...(e.clipboardData?.files ?? [])]; if (f.length) { e.preventDefault(); addFiles(f) } }}
        rows="1"
        {placeholder}
        aria-label="Message"
        class="max-h-40 min-h-9 flex-1 resize-none bg-transparent px-1 py-2 text-[15px] outline-none placeholder:text-muted-foreground [field-sizing:content]"
      ></textarea>
      <Button size="icon" onclick={send} disabled={sending || (!text.trim() && !pending.length)} aria-label="Send"><Icon icon={icons.Send} /></Button>
    </div>
    <p class="mt-1 px-1 text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line · paste or attach images to preview before sending · Markdown works</p>
  </div>
</div>
