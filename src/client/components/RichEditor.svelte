<script lang="ts">
  /**
   * The text editor used for messages, docs, comments, notes, check-in answers.
   * Markdown under the hood (headings, bold, lists, links, tables, code blocks),
   * with a toolbar, live preview, @mentions, file/image attach + paste,
   * and voice notes. ⌘/Ctrl+Enter submits.
   */
  import type { Person } from '../../shared/models'
  import { uploadFiles } from '../lib/api'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import { toast } from '../lib/state.svelte'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'
  import RichText from './RichText.svelte'
  import VoiceRecorder from './VoiceRecorder.svelte'

  let {
    value = $bindable(''),
    people = [],
    projectId = null,
    placeholder = 'Write something…',
    rows = 6,
    autofocus = false,
    id,
    label = 'Text',
    minimal = false,
    onsubmit,
  }: {
    value?: string
    people?: Person[]
    projectId?: number | null
    placeholder?: string
    rows?: number
    autofocus?: boolean
    id?: string
    label?: string
    /** Hide heading/table/code buttons (comments, chat). */
    minimal?: boolean
    onsubmit?: () => void
  } = $props()

  let ta = $state<HTMLTextAreaElement | null>(null)
  let fileInput = $state<HTMLInputElement | null>(null)
  let tab = $state<'write' | 'preview'>('write')
  let recording = $state(false)
  let uploading = $state(0)
  let mention = $state<{ start: number; q: string } | null>(null)
  let mentionActive = $state(0)

  $effect(() => {
    if (autofocus) ta?.focus()
  })

  function edit(fn: (text: string, s: number, e: number) => { text: string; s: number; e: number }) {
    if (!ta) return
    const r = fn(value, ta.selectionStart, ta.selectionEnd)
    value = r.text
    queueMicrotask(() => {
      ta?.focus()
      ta?.setSelectionRange(r.s, r.e)
    })
  }

  const wrap = (before: string, after = before, fallback = 'text') =>
    edit((t, s, e) => {
      const sel = t.slice(s, e) || fallback
      return { text: t.slice(0, s) + before + sel + after + t.slice(e), s: s + before.length, e: s + before.length + sel.length }
    })

  const prefixLines = (prefix: (i: number) => string) =>
    edit((t, s, e) => {
      const lineStart = t.lastIndexOf('\n', s - 1) + 1
      const block = t.slice(lineStart, e) || ''
      const out = block
        .split('\n')
        .map((l, i) => prefix(i) + l)
        .join('\n')
      return { text: t.slice(0, lineStart) + out + t.slice(e), s: lineStart, e: lineStart + out.length }
    })

  const insert = (snippet: string) =>
    edit((t, s, e) => {
      const needsNl = s > 0 && t[s - 1] !== '\n' && snippet.startsWith('\n') === false && /^[#|`!]/.test(snippet)
      const text = (needsNl ? '\n' : '') + snippet
      return { text: t.slice(0, s) + text + t.slice(e), s: s + text.length, e: s + text.length }
    })

  function link() {
    const url = prompt('Link to (https://…)')
    if (!url) return
    if (!/^(https?:\/\/|mailto:|\/)/i.test(url)) return toast('Links must start with https:// or /', 'error')
    wrap('[', `](${url})`, 'link text')
  }

  const TOOLBAR = $derived([
    { icon: icons.Bold, label: 'Bold (⌘B)', run: () => wrap('**') },
    { icon: icons.Italic, label: 'Italic (⌘I)', run: () => wrap('_') },
    { icon: icons.Strikethrough, label: 'Strikethrough', run: () => wrap('~~') },
    ...(minimal ? [] : [{ icon: icons.Heading1, label: 'Heading', run: () => prefixLines(() => '## ') }]),
    { icon: icons.List, label: 'Bulleted list', run: () => prefixLines(() => '- ') },
    { icon: icons.ListOrdered, label: 'Numbered list', run: () => prefixLines((i) => `${i + 1}. `) },
    { icon: icons.Quote, label: 'Quote', run: () => prefixLines(() => '> ') },
    { icon: icons.SquareCode, label: 'Code block', run: () => wrap('\n```\n', '\n```\n', 'code') },
    ...(minimal ? [] : [{ icon: icons.Table, label: 'Table', run: () => insert('\n| Column | Column |\n| --- | --- |\n| Cell | Cell |\n') }]),
    { icon: icons.Link, label: 'Link', run: link },
  ])

  async function attachFiles(files: File[]) {
    if (!files.length) return
    uploading++
    try {
      const saved = await uploadFiles(files, projectId)
      insert(
        saved
          .map((f) => (f.kind === 'image' ? `![${f.filename}](${f.url})` : f.kind === 'voice' ? `!audio[${f.filename}](${f.url})` : `[📎 ${f.filename}](${f.url})`))
          .join('\n') + '\n',
      )
    } catch (e) {
      toast(e instanceof Error ? e.message : 'Upload failed', 'error')
    } finally {
      uploading--
    }
  }

  async function attachVoice(blob: Blob, seconds: number, ext: string) {
    const [saved] = await uploadFiles([blob], projectId, [`voice-note.${ext}`])
    if (saved) insert(`!audio[Voice note · ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}](${saved.url})\n`)
    recording = false
  }

  function onPaste(e: ClipboardEvent) {
    const files = [...(e.clipboardData?.files ?? [])]
    if (files.length) {
      e.preventDefault()
      void attachFiles(files)
    }
  }

  function onDrop(e: DragEvent) {
    const files = [...(e.dataTransfer?.files ?? [])]
    if (files.length) {
      e.preventDefault()
      void attachFiles(files)
    }
  }

  const mentionOptions = $derived(
    mention ? people.filter((p) => p.name.toLowerCase().includes(mention!.q.toLowerCase())).slice(0, 6) : [],
  )

  function detectMention() {
    if (!ta || !people.length) return
    const upto = value.slice(0, ta.selectionStart)
    const m = upto.match(/(^|\s)@([\p{L}\p{N}._-]{0,30})$/u)
    mention = m ? { start: upto.length - (m[2]?.length ?? 0) - 1, q: m[2] ?? '' } : null
    mentionActive = 0
  }

  function pickMention(p: Person) {
    if (!mention || !ta) return
    const end = ta.selectionStart
    const token = `@[${p.name}](mention:${p.id}) `
    const start = mention.start
    value = value.slice(0, start) + token + value.slice(end)
    mention = null
    queueMicrotask(() => {
      ta?.focus()
      ta?.setSelectionRange(start + token.length, start + token.length)
    })
  }

  function onKey(e: KeyboardEvent) {
    if (mention && mentionOptions.length) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        mentionActive = (mentionActive + 1) % mentionOptions.length
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        mentionActive = (mentionActive - 1 + mentionOptions.length) % mentionOptions.length
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        const p = mentionOptions[mentionActive]
        if (p) pickMention(p)
        return
      }
      if (e.key === 'Escape') {
        e.stopPropagation()
        mention = null
        return
      }
    }
    if ((e.metaKey || e.ctrlKey) && e.key === 'Enter' && onsubmit) {
      e.preventDefault()
      onsubmit()
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
      e.preventDefault()
      wrap('**')
    } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'i') {
      e.preventDefault()
      wrap('_')
    }
  }
</script>

<div class="relative rounded-md border border-input bg-card shadow-sm focus-within:ring-2 focus-within:ring-ring">
  <div class="flex flex-wrap items-center gap-0.5 border-b px-1.5 py-1">
    {#each TOOLBAR as b (b.label)}
      <button
        type="button"
        title={b.label}
        aria-label={b.label}
        disabled={tab === 'preview'}
        onclick={b.run}
        class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground disabled:opacity-40"
      >
        <Icon icon={b.icon} size={15} />
      </button>
    {/each}
    <span class="mx-1 h-4 w-px bg-border"></span>
    <button type="button" title="Attach files" aria-label="Attach files" onclick={() => fileInput?.click()} class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon icon={icons.Paperclip} size={15} />
    </button>
    <button type="button" title="Record a voice note" aria-label="Record a voice note" onclick={() => (recording = true)} class="flex h-7 w-7 items-center justify-center rounded text-muted-foreground hover:bg-muted hover:text-foreground">
      <Icon icon={icons.Mic} size={15} />
    </button>
    <input bind:this={fileInput} type="file" multiple class="hidden" onchange={(e) => { const t = e.currentTarget as HTMLInputElement; void attachFiles([...(t.files ?? [])]); t.value = '' }} />
    <div class="ml-auto flex items-center gap-0.5 text-xs">
      {#if uploading}<span class="mr-2 text-muted-foreground">Uploading…</span>{/if}
      <button type="button" onclick={() => (tab = 'write')} class={cn('rounded px-2 py-1', tab === 'write' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:text-foreground')}>Write</button>
      <button type="button" onclick={() => (tab = 'preview')} class={cn('rounded px-2 py-1', tab === 'preview' ? 'bg-muted font-semibold' : 'text-muted-foreground hover:text-foreground')}>Preview</button>
    </div>
  </div>
  {#if recording}
    <div class="border-b p-2">
      <VoiceRecorder onattach={attachVoice} oncancel={() => (recording = false)} />
    </div>
  {/if}
  {#if tab === 'write'}
    <textarea
      bind:this={ta}
      bind:value
      {id}
      {rows}
      {placeholder}
      aria-label={label}
      oninput={detectMention}
      onclick={detectMention}
      onkeydown={onKey}
      onpaste={onPaste}
      ondrop={onDrop}
      class="block w-full resize-y bg-transparent px-3 py-2.5 text-[15px] leading-relaxed outline-none placeholder:text-muted-foreground"
    ></textarea>
  {:else}
    <div class="min-h-[120px] px-3 py-2.5">
      {#if value.trim()}<RichText body={value} />{:else}<p class="text-sm text-muted-foreground">Nothing to preview yet.</p>{/if}
    </div>
  {/if}
  {#if mention && mentionOptions.length}
    <ul class="absolute left-2 top-full z-50 mt-1 w-64 rounded-md border bg-popover p-1 shadow-lg" role="listbox" aria-label="Mention someone">
      {#each mentionOptions as p, i (p.id)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={i === mentionActive}
            onmousedown={(e) => {
              e.preventDefault()
              pickMention(p)
            }}
            class={cn('flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm', i === mentionActive && 'bg-accent')}
          >
            <Avatar person={p} size={20} /> {p.name}
          </button>
        </li>
      {/each}
    </ul>
  {/if}
  <p class="border-t px-3 py-1 text-[11px] text-muted-foreground">
    Markdown works · type @ to mention · paste or drop files{onsubmit ? ' · ⌘↵ to post' : ''}
  </p>
</div>
