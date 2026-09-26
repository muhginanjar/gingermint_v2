<script lang="ts">
  /** Comments on any recordable: list, boosts, inline edit/delete, and the composer. */
  import { router } from '@inertiajs/svelte'
  import type { Comment, Person } from '../../shared/models'
  import * as icons from '../lib/icons'
  import { formatDateTime, relativeTime } from '../lib/time'
  import Avatar from './ui/Avatar.svelte'
  import Button from './ui/Button.svelte'
  import Icon from './ui/Icon.svelte'
  import Reactions from './Reactions.svelte'
  import RichEditor from './RichEditor.svelte'
  import RichText from './RichText.svelte'

  let {
    type,
    id,
    comments,
    people = [],
    projectId,
    canComment = true,
  }: { type: string; id: number; comments: Comment[]; people?: Person[]; projectId: number; canComment?: boolean } = $props()

  let body = $state('')
  let posting = $state(false)
  let editing = $state<number | null>(null)
  let editBody = $state('')
  let composerOpen = $state(false)

  function post() {
    if (!body.trim()) return
    posting = true
    router.post('/comments', { type, id, body }, {
      preserveScroll: true,
      onSuccess: () => {
        body = ''
        composerOpen = false
      },
      onFinish: () => (posting = false),
    })
  }

  function startEdit(c: Comment) {
    editing = c.id
    editBody = c.body
  }

  function saveEdit() {
    if (editing === null) return
    router.patch(`/comments/${editing}`, { body: editBody }, { preserveScroll: true, onSuccess: () => (editing = null) })
  }

  function remove(c: Comment) {
    if (!confirm('Delete this comment?')) return
    router.delete(`/comments/${c.id}`, { preserveScroll: true })
  }
</script>

<section aria-label="Comments" class="mt-10 border-t pt-6">
  <ol class="grid gap-6">
    {#each comments as c (c.id)}
      <li id={`comment-${c.id}`} class="group flex scroll-mt-24 gap-3 target:rounded-md target:bg-ginger-soft/50">
        <Avatar person={c.author} size={36} />
        <div class="min-w-0 flex-1">
          <div class="flex flex-wrap items-baseline gap-x-2">
            <span class="font-semibold">{c.author?.name ?? 'Someone'}</span>
            <a href={`#comment-${c.id}`} class="text-xs text-muted-foreground hover:underline" title={formatDateTime(c.createdAt)}>{relativeTime(c.createdAt)}</a>
            {#if c.updatedAt !== c.createdAt}<span class="text-xs text-muted-foreground">· edited</span>{/if}
            {#if c.canEdit && editing !== c.id}
              <span class="ml-auto flex gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                <button type="button" class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Edit comment" onclick={() => startEdit(c)}><Icon icon={icons.Pencil} size={14} /></button>
                <button type="button" class="rounded p-1 text-muted-foreground hover:bg-muted hover:text-destructive" aria-label="Delete comment" onclick={() => remove(c)}><Icon icon={icons.Trash} size={14} /></button>
              </span>
            {/if}
          </div>
          {#if editing === c.id}
            <div class="mt-2 grid gap-2">
              <RichEditor bind:value={editBody} {people} {projectId} rows={4} minimal onsubmit={saveEdit} autofocus />
              <div class="flex gap-2">
                <Button size="sm" onclick={saveEdit}>Save changes</Button>
                <Button size="sm" variant="ghost" onclick={() => (editing = null)}>Cancel</Button>
              </div>
            </div>
          {:else}
            <RichText body={c.body} class="mt-1" />
            <div class="mt-2"><Reactions type="comment" id={c.id} reactions={c.reactions} compact /></div>
          {/if}
        </div>
      </li>
    {/each}
  </ol>

  {#if canComment}
    <div class="mt-6 flex gap-3">
      <span class="hidden sm:block"><Icon icon={icons.MessageCircle} size={20} class="mt-2 text-muted-foreground" /></span>
      <div class="min-w-0 flex-1">
        {#if composerOpen || body}
          <div class="grid gap-2">
            <RichEditor bind:value={body} {people} {projectId} rows={4} minimal placeholder="Add a comment… (type @ to mention someone)" onsubmit={post} autofocus />
            <div class="flex gap-2">
              <Button onclick={post} disabled={posting || !body.trim()}>{posting ? 'Posting…' : 'Add this comment'}</Button>
              <Button variant="ghost" onclick={() => { composerOpen = false; body = '' }}>Cancel</Button>
            </div>
          </div>
        {:else}
          <button
            type="button"
            onclick={() => (composerOpen = true)}
            class="w-full rounded-md border border-dashed px-4 py-3 text-left text-sm text-muted-foreground hover:border-solid hover:bg-muted/40"
          >
            Add a comment here…
          </button>
        {/if}
      </div>
    </div>
  {/if}
</section>
