<script lang="ts">
  /** People on a project + invite (existing people or new emails), members vs clients (Client Mode). */
  import { router } from '@inertiajs/svelte'
  import type { Person, ProjectDetail } from '../../../shared/models'
  import PeoplePicker from '../../components/PeoplePicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Tabs from '../../components/ui/Tabs.svelte'
  import Textarea from '../../components/ui/Textarea.svelte'
  import * as icons from '../../lib/icons'

  let { project, everyone, errors = {} }: { project: ProjectDetail; everyone: Person[]; assignable: Person[]; errors?: Record<string, string> } = $props()

  const isClient = $derived(project.myRole === 'client')
  const onProject = $derived(new Set(project.people.map((p) => p.id)))
  const candidates = $derived(everyone.filter((p) => !onProject.has(p.id)))
  let selected = $state<number[]>([])
  let emails = $state('')
  let role = $state('member')
  let busy = $state(false)

  const team = $derived(project.people.filter((p) => p.role === 'member'))
  const clients = $derived(project.people.filter((p) => p.role === 'client'))

  function invite(e: SubmitEvent) {
    e.preventDefault()
    busy = true
    router.post(`/projects/${project.id}/people`, { userIds: selected, emails, role }, {
      preserveScroll: true,
      onSuccess: () => {
        selected = []
        emails = ''
      },
      onFinish: () => (busy = false),
    })
  }

  const remove = (p: Person) =>
    confirm(`Remove ${p.name} from ${project.name}?`) && router.delete(`/projects/${project.id}/people/${p.id}`, { preserveScroll: true })
</script>

{#snippet personRow(p: Person & { role: string })}
  <li class="flex items-center gap-3 py-2.5">
    <Avatar person={p} size={34} />
    <div class="min-w-0 flex-1">
      <p class="font-semibold">{p.name}</p>
      <p class="truncate text-sm text-muted-foreground">{p.title || p.email}</p>
    </div>
    {#if !isClient}
      <Button size="xs" variant="ghost" class="text-muted-foreground" onclick={() => remove(p)}>Remove</Button>
    {/if}
  </li>
{/snippet}

<ProjectShell {project} title="People" crumbs={[{ label: 'People' }]}>
  <SheetHeader title="People on this project" subtitle={project.access === 'all' ? 'This project is All-access: everyone in the account can see it.' : `${project.people.length} people can see this project.`} />

  {#if !isClient}
    <form onsubmit={invite} class="mb-8 grid gap-4 rounded-lg border bg-muted/30 p-4">
      <h2 class="font-bold">Invite people</h2>
      <Tabs items={[{ value: 'member', label: 'Team members' }, { value: 'client', label: 'Clients' }]} bind:value={role} label="Invite as" />
      {#if role === 'client'}
        <p class="flex items-start gap-2 text-sm text-muted-foreground">
          <Icon icon={icons.Eye} class="mt-0.5" /> Clients only see what you mark “The client sees this” — in Message Board, To-dos, Docs & Files and Schedule. Chat, Card Table and internal items stay private.
        </p>
      {/if}
      <Field id="invite-people" label="People already in the account">
        <PeoplePicker people={candidates} bind:selected id="invite-people" placeholder="Type a name…" />
      </Field>
      <Field id="invite-emails" label="Or invite by email" error={errors.emails} hint="Separate with commas. New people get an email to set their password.">
        <Textarea id="invite-emails" bind:value={emails} rows={2} placeholder="alex@example.com, sam@client.com" />
      </Field>
      <Button type="submit" class="justify-self-start" disabled={busy || (!selected.length && !emails.trim())}>
        <Icon icon={icons.UserPlus} /> Add to project
      </Button>
    </form>
  {/if}

  <div class="grid gap-8 md:grid-cols-2">
    <section>
      <h2 class="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Team ({team.length})</h2>
      <ul class="divide-y">{#each team as p (p.id)}{@render personRow(p)}{/each}</ul>
    </section>
    <section>
      <h2 class="mb-1 text-sm font-bold uppercase tracking-wide text-muted-foreground">Clients ({clients.length})</h2>
      <ul class="divide-y">
        {#each clients as p (p.id)}{@render personRow(p)}{:else}<li class="py-3 text-sm text-muted-foreground">No clients on this project.</li>{/each}
      </ul>
    </section>
  </div>
</ProjectShell>
