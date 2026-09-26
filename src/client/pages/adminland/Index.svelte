<script lang="ts">
  /** Adminland: people & roles, account settings, project templates, archived projects. */
  import { Link, router, usePage } from '@inertiajs/svelte'
  import type { ProjectSummary } from '../../../shared/models'
  import type { SharedPageProps } from '../../../shared/types'
  import AppShell from '../../components/AppShell.svelte'
  import ProjectMark from '../../components/ProjectMark.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Select from '../../components/ui/Select.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import Textarea from '../../components/ui/Textarea.svelte'
  import { uploadFiles } from '../../lib/api'
  import * as icons from '../../lib/icons'
  import { relativeTime } from '../../lib/time'

  type Row = { id: number; name: string; email: string; title: string; avatarUrl: string | null; role: string; lastSeenAt: string | null; createdAt: string }

  let {
    tab: initialTab,
    account,
    people,
    archived,
    templates,
    errors = {},
  }: { tab: string; account: { name: string; logo: string | null }; people: Row[]; archived: ProjectSummary[]; templates: ProjectSummary[]; errors?: Record<string, string> } = $props()

  const page = usePage<SharedPageProps>()
  let tab = $state(initialTab)
  let accountName = $state(account.name)
  let logo = $state(account.logo)
  let invite = $state({ name: '', email: '', role: 'member' })
  const ROLE_OPTIONS = [
    { value: 'member', label: 'Member' },
    { value: 'admin', label: 'Admin' },
    { value: 'client', label: 'Client' },
  ]
  let tpl = $state({ name: '', description: '' })
  let filter = $state('')
  let logoInput = $state<HTMLInputElement | null>(null)

  const shown = $derived(people.filter((p) => !filter.trim() || `${p.name} ${p.email} ${p.title}`.toLowerCase().includes(filter.trim().toLowerCase())))

  async function onLogo(e: Event) {
    const f = (e.currentTarget as HTMLInputElement).files?.[0]
    if (!f) return
    const [saved] = await uploadFiles([f], null)
    if (saved) logo = saved.url
  }
</script>

<AppShell tint="global" title="Adminland" crumbs={[{ label: 'Adminland' }]}>
  <Sheet>
    <h1 class="flex items-center gap-2 text-[34px] font-black tracking-tight"><Icon icon={icons.KeyRound} size={26} /> Adminland</h1>
    <p class="text-muted-foreground">Manage who's in the <strong>{account.name}</strong> workspace, how it looks, and what's archived. Clients only see projects they're added to.</p>
    <Tabs class="mt-5" items={[
      { value: 'people', label: 'People', count: people.length },
      { value: 'account', label: 'Account' },
      { value: 'templates', label: 'Templates', count: templates.length },
      { value: 'archived', label: 'Archived', count: archived.length },
    ]} bind:value={tab} label="Adminland section" />

    {#if tab === 'people'}
      <form class="mt-6 grid gap-3 rounded-lg border bg-muted/30 p-4 sm:grid-cols-[1fr_1fr_150px_auto] sm:items-end" onsubmit={(e) => { e.preventDefault(); router.post('/adminland/people', invite, { preserveScroll: true, onSuccess: () => (invite = { name: '', email: '', role: 'member' }) }) }}>
        <Field id="a-name" label="Name" error={errors.name}><Input id="a-name" bind:value={invite.name} /></Field>
        <Field id="a-email" label="Email" error={errors.email}><Input id="a-email" type="email" bind:value={invite.email} /></Field>
        <Field id="a-role" label="Role"><Select id="a-role" bind:value={invite.role} options={ROLE_OPTIONS} /></Field>
        <Button type="submit"><Icon icon={icons.UserPlus} /> Invite</Button>
      </form>
      <input bind:value={filter} placeholder="Filter people…" aria-label="Filter people" class="mt-5 h-9 w-64 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
      {#if errors.role || errors.person}<p class="mt-2 text-sm text-destructive">{errors.role ?? errors.person}</p>{/if}
      <ul class="mt-3 divide-y border-y">
        {#each shown as p (p.id)}
          <li class="flex flex-wrap items-center gap-3 py-3">
            <Avatar person={p} size={36} />
            <div class="min-w-0 flex-1">
              <Link href={`/people/${p.id}`} class="font-semibold hover:underline">{p.name}</Link>
              <p class="truncate text-sm text-muted-foreground">{p.email}{p.title ? ` · ${p.title}` : ''} · {p.lastSeenAt ? `active ${relativeTime(p.lastSeenAt)}` : 'never signed in'}</p>
            </div>
            <Select value={p.role} options={ROLE_OPTIONS} class="h-8 w-32" aria-label={`Role for ${p.name}`} onchange={(e: Event) => router.patch(`/adminland/people/${p.id}`, { role: (e.currentTarget as HTMLSelectElement).value }, { preserveScroll: true })} />
            {#if p.id !== page.props.auth.user?.id}
              <Button size="xs" variant="ghost" class="text-destructive" onclick={() => confirm(`Remove ${p.name} from the account? Their content stays.`) && router.delete(`/adminland/people/${p.id}`, { preserveScroll: true })}>Remove</Button>
            {/if}
          </li>
        {/each}
      </ul>
    {:else if tab === 'account'}
      <form class="mt-6 grid max-w-md gap-4" onsubmit={(e) => { e.preventDefault(); router.patch('/adminland/account', { name: accountName, logo }) }}>
        <Field id="acc-name" label="Workspace name" error={errors.name} hint="Shown at the top of every page."><Input id="acc-name" bind:value={accountName} /></Field>
        <Field label="Logo">
          <div class="flex items-center gap-3">
            {#if logo}<img src={logo} alt="" class="h-12 w-12 rounded-lg border object-cover" />{/if}
            <input bind:this={logoInput} type="file" accept="image/*" class="hidden" onchange={onLogo} />
            <Button variant="outline" size="sm" onclick={() => logoInput?.click()}><Icon icon={icons.Upload} /> Upload</Button>
            {#if logo}<button type="button" class="text-xs underline" onclick={() => (logo = null)}>Remove</button>{/if}
          </div>
        </Field>
        <Button type="submit" class="justify-self-start">Save account</Button>
      </form>
    {:else if tab === 'templates'}
      <p class="mt-6 text-sm text-muted-foreground">Templates copy their tools, to-do lists, card columns, docs and check-ins into new projects. You can also save any project as a template from its ··· menu.</p>
      <form class="mt-4 grid max-w-xl gap-3 rounded-lg border bg-muted/30 p-4" onsubmit={(e) => { e.preventDefault(); router.post('/adminland/templates', tpl) }}>
        <Field id="t-name" label="New template name" error={errors.name}><Input id="t-name" bind:value={tpl.name} placeholder="e.g. Client onboarding" /></Field>
        <Field id="t-desc" label="Description"><Textarea id="t-desc" bind:value={tpl.description} rows={2} /></Field>
        <Button type="submit" class="justify-self-start" disabled={!tpl.name.trim()}>Create template</Button>
      </form>
      <ul class="mt-6 divide-y border-y">
        {#each templates as t (t.id)}
          <li class="flex items-center gap-3 py-3">
            <ProjectMark project={t} size={28} />
            <Link href={`/projects/${t.id}`} class="flex-1 font-semibold hover:underline">{t.name}</Link>
            <Button size="sm" variant="outline" href={`/projects/new?template=${t.id}`}>Use template</Button>
          </li>
        {:else}
          <li class="py-6 text-center text-sm text-muted-foreground">No templates yet.</li>
        {/each}
      </ul>
    {:else}
      <ul class="mt-6 divide-y border-y">
        {#each archived as p (p.id)}
          <li class="flex items-center gap-3 py-3">
            <ProjectMark project={p} size={28} />
            <Link href={`/projects/${p.id}`} class="flex-1 font-semibold hover:underline">{p.name}</Link>
            <span class="text-xs text-muted-foreground">archived {p.archivedAt ? relativeTime(p.archivedAt) : ''}</span>
            <Button size="sm" variant="outline" onclick={() => router.post(`/projects/${p.id}/archive`, { archived: false })}><Icon icon={icons.ArchiveRestore} /> Unarchive</Button>
          </li>
        {:else}
          <li class="py-6 text-center text-sm text-muted-foreground">No archived projects.</li>
        {/each}
      </ul>
    {/if}
  </Sheet>
</AppShell>
