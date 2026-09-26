<script lang="ts">
  /** Your workspaces: switch between them, start a new one, rename, leave or delete. */
  import { router, useForm } from '@inertiajs/svelte'
  import type { WorkspaceSummary } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import WorkspaceMark from '../../components/WorkspaceMark.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import * as icons from '../../lib/icons'

  let { workspaces, errors = {} }: { workspaces: WorkspaceSummary[]; errors?: Record<string, string> } = $props()

  const form = useForm({ name: '' })
  const ROLE = { admin: 'Admin', member: 'Member', client: 'Client' }

  // One dialog at a time, for the workspace being changed.
  let target = $state<WorkspaceSummary | null>(null)
  let mode = $state<'rename' | 'leave' | 'delete'>('rename')
  let open = $state(false)
  let name = $state('')
  let confirm = $state('')
  let busy = $state(false)

  function start(w: WorkspaceSummary, m: typeof mode) {
    target = w
    mode = m
    name = w.name
    confirm = ''
    open = true
  }

  const done = { onSuccess: () => (open = false), onFinish: () => (busy = false), preserveScroll: true }

  function submit() {
    if (!target) return
    busy = true
    if (mode === 'rename') router.patch(`/workspaces/${target.id}`, { name }, done)
    else if (mode === 'leave') router.post(`/workspaces/${target.id}/leave`, {}, done)
    else router.delete(`/workspaces/${target.id}`, { data: { confirm }, ...done })
  }

  const TITLE = { rename: 'Rename workspace', leave: 'Leave workspace?', delete: 'Delete workspace?' }
</script>

<AppShell tint="global" title="Your workspaces" crumbs={[{ label: 'Workspaces' }]}>
  <Sheet class="mx-auto max-w-2xl">
    <SheetHeader title="Your workspaces" subtitle="Each workspace has its own projects, people, pings and settings. Switch any time with Shift+J." />
    {#if errors.workspace}
      <p class="mb-3 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">{errors.workspace}</p>
    {/if}
    <ul class="divide-y border-y">
      {#each workspaces as w (w.id)}
        <li class="flex flex-wrap items-center gap-3 py-3">
          <WorkspaceMark workspace={w} size={40} />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{w.name}</p>
            <p class="text-sm text-muted-foreground">{ROLE[w.role]}{w.unread ? ` · ${w.unread} unread` : ''}</p>
          </div>
          <div class="flex items-center gap-1">
            {#if w.current}
              <span class="mr-1 rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">You're here</span>
            {:else}
              <Button variant="outline" size="sm" onclick={() => router.post(`/workspaces/${w.id}/switch`)}>Switch <Icon icon={icons.ArrowUpRight} /></Button>
            {/if}
            {#if w.role === 'admin'}
              <Button variant="ghost" size="icon-sm" title="Rename" aria-label="Rename {w.name}" onclick={() => start(w, 'rename')}><Icon icon={icons.Pencil} /></Button>
            {/if}
            {#if workspaces.length > 1}
              <Button variant="ghost" size="icon-sm" title="Leave" aria-label="Leave {w.name}" onclick={() => start(w, 'leave')}><Icon icon={icons.LogOut} /></Button>
            {/if}
            {#if w.role === 'admin' && w.id !== 1}
              <Button variant="ghost" size="icon-sm" class="text-destructive hover:text-destructive" title="Delete" aria-label="Delete {w.name}" onclick={() => start(w, 'delete')}><Icon icon={icons.Trash} /></Button>
            {/if}
          </div>
        </li>
      {/each}
    </ul>

    <form class="mt-8 grid gap-3 rounded-lg border bg-muted/30 p-4" onsubmit={(e) => { e.preventDefault(); form.post('/workspaces') }}>
      <h2 class="font-bold">Start a new workspace</h2>
      <p class="text-sm text-muted-foreground">For a different company, client or side project. You'll be its admin and can invite people from Adminland.</p>
      <Field id="ws-name" label="Workspace name" error={form.errors.name}>
        <Input id="ws-name" bind:value={form.name} placeholder="e.g. Acme Agency" />
      </Field>
      <Button type="submit" class="justify-self-start" disabled={form.processing || !form.name.trim()}><Icon icon={icons.Plus} /> Create workspace</Button>
    </form>
  </Sheet>

  <Dialog bind:open title={TITLE[mode]} size="sm">
    {#if target}
      {#if mode === 'rename'}
        <Field id="ws-rename" label="Name" error={errors.name}>
          <Input id="ws-rename" bind:value={name} onkeydown={(e: KeyboardEvent) => e.key === 'Enter' && submit()} />
        </Field>
      {:else if mode === 'leave'}
        <p class="text-sm">You'll lose access to <strong>{target.name}</strong> and be taken off its projects. An admin can invite you back later.</p>
        {#if errors.workspace}<p class="text-sm text-destructive">{errors.workspace}</p>{/if}
      {:else}
        <p class="text-sm">This permanently deletes <strong>{target.name}</strong> with all its projects, to-dos, messages, files, pings and people's access. It can't be undone.</p>
        <Field id="ws-confirm" label="Type the workspace name to confirm" error={errors.confirm}>
          <Input id="ws-confirm" bind:value={confirm} placeholder={target.name} />
        </Field>
      {/if}
    {/if}
    {#snippet footer()}
      <Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
      {#if mode === 'rename'}
        <Button onclick={submit} disabled={busy || !name.trim()}>Save</Button>
      {:else if mode === 'leave'}
        <Button variant="destructive" onclick={submit} disabled={busy}>Leave workspace</Button>
      {:else}
        <Button variant="destructive" onclick={submit} disabled={busy || confirm.trim() !== target?.name}>Delete forever</Button>
      {/if}
    {/snippet}
  </Dialog>
</AppShell>
