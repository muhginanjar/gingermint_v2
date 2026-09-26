<script lang="ts">
  /** Record → listen → redo → attach. Uses MediaRecorder (webm/opus or mp4 on Safari). */
  import * as icons from '../lib/icons'
  import Button from './ui/Button.svelte'
  import Icon from './ui/Icon.svelte'

  let { onattach, oncancel }: { onattach: (blob: Blob, seconds: number, ext: string) => void | Promise<void>; oncancel: () => void } = $props()

  let phase = $state<'idle' | 'recording' | 'recorded' | 'error'>('idle')
  let seconds = $state(0)
  let url = $state<string | null>(null)
  let blob: Blob | null = null
  let recorder: MediaRecorder | null = null
  let stream: MediaStream | null = null
  let chunks: Blob[] = []
  let tick: ReturnType<typeof setInterval> | undefined
  let busy = $state(false)
  let errorText = $state('')

  const mm = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`

  async function start() {
    errorText = ''
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    } catch {
      phase = 'error'
      errorText = 'Microphone access was blocked. Allow it in your browser to record.'
      return
    }
    const type = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4'].find((t) => MediaRecorder.isTypeSupported?.(t)) ?? ''
    recorder = new MediaRecorder(stream, type ? { mimeType: type } : undefined)
    chunks = []
    recorder.ondataavailable = (e) => e.data.size && chunks.push(e.data)
    recorder.onstop = () => {
      blob = new Blob(chunks, { type: recorder?.mimeType || 'audio/webm' })
      if (url) URL.revokeObjectURL(url)
      url = URL.createObjectURL(blob)
      phase = 'recorded'
      stream?.getTracks().forEach((t) => t.stop())
    }
    recorder.start()
    seconds = 0
    phase = 'recording'
    tick = setInterval(() => {
      seconds++
      if (seconds >= 600) stop()
    }, 1000)
  }

  function stop() {
    clearInterval(tick)
    recorder?.state === 'recording' && recorder.stop()
  }

  function redo() {
    if (url) URL.revokeObjectURL(url)
    url = null
    blob = null
    void start()
  }

  async function attach() {
    if (!blob) return
    busy = true
    try {
      await onattach(blob, seconds, blob.type.includes('mp4') ? 'm4a' : 'webm')
    } finally {
      busy = false
    }
  }

  function cancel() {
    stop()
    stream?.getTracks().forEach((t) => t.stop())
    if (url) URL.revokeObjectURL(url)
    oncancel()
  }

  $effect(() => {
    void start()
    return () => {
      clearInterval(tick)
      stream?.getTracks().forEach((t) => t.stop())
    }
  })
</script>

<div class="flex flex-wrap items-center gap-2 rounded-md border bg-muted/50 px-3 py-2" role="group" aria-label="Voice note recorder">
  {#if phase === 'recording'}
    <span class="h-2.5 w-2.5 rounded-full bg-red-600 animate-[recording_1s_ease-in-out_infinite]" aria-hidden="true"></span>
    <span class="font-mono text-sm tabular-nums">{mm(seconds)}</span>
    <span class="text-sm text-muted-foreground">Recording…</span>
    <Button size="sm" variant="secondary" class="ml-auto" onclick={stop}><Icon icon={icons.Square} /> Stop</Button>
  {:else if phase === 'recorded' && url}
    <audio controls src={url} class="h-9 max-w-full flex-1"></audio>
    <Button size="sm" variant="ghost" onclick={redo}><Icon icon={icons.RotateCcw} /> Redo</Button>
    <Button size="sm" onclick={attach} disabled={busy}><Icon icon={icons.Check} /> {busy ? 'Adding…' : 'Add voice note'}</Button>
  {:else if phase === 'error'}
    <Icon icon={icons.TriangleAlert} class="text-destructive" />
    <span class="text-sm">{errorText}</span>
  {:else}
    <span class="text-sm text-muted-foreground">Starting microphone…</span>
  {/if}
  <Button size="sm" variant="ghost" onclick={cancel} aria-label="Cancel recording"><Icon icon={icons.X} /></Button>
</div>
