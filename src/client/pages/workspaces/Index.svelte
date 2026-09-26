<script lang="ts">
  /** Your workspaces: switch between them, or start a new one. */
  import { router, useForm } from '@inertiajs/svelte'
  import type { WorkspaceSummary } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import WorkspaceMark from '../../components/WorkspaceMark.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import * as icons from '../../lib/icons'

  let { workspaces }: { workspaces: WorkspaceSummary[] } = $props()

  const form = useForm({ name: '' })
  const ROLE = { admin: 'Admin', member: 'Member', client: 'Client' }
</script>

<AppShell tint="global" title="Your workspaces" crumbs={[{ label: 'Workspaces' }]}>
  <Sheet class="mx-auto max-w-2xl">
    <SheetHeader title="Your workspaces" subtitle="Each workspace has its own projects, people, pings and settings. Switch any time with Shift+J." />
    <ul class="divide-y border-y">
      {#each workspaces as w (w.id)}
        <li class="flex items-center gap-3 py-3">
          <WorkspaceMark workspace={w} size={40} />
          <div class="min-w-0 flex-1">
            <p class="truncate font-bold">{w.name}</p>
            <p class="text-sm text-muted-foreground">{ROLE[w.role]}{w.unread ? ` · ${w.unread} unread` : ''}</p>
          </div>
          {#if w.current}
            <span class="rounded-full bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground">You're here</span>
          {:else}
            <Button variant="outline" size="sm" onclick={() => router.post(`/workspaces/${w.id}/switch`)}>Switch <Icon icon={icons.ArrowUpRight} /></Button>
          {/if}
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
</AppShell>
