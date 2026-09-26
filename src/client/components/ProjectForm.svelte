<script lang="ts" module>
  export interface ProjectFields {
    name: string
    description: string
    icon: string
    color: string
    folderId: number | null | string
    leadId: number | null | string
    phase: string
    status: string
    startOn: string
    endOn: string
    access: string
  }
</script>

<script lang="ts">
  /** Shared fields for creating/editing a project. */
  import type { Folder, Person } from '../../shared/models'
  import ColorPicker from './ColorPicker.svelte'
  import IconPicker from './IconPicker.svelte'
  import Field from './ui/Field.svelte'
  import Input from './ui/Input.svelte'
  import Select from './ui/Select.svelte'
  import Textarea from './ui/Textarea.svelte'

  let {
    form = $bindable(),
    folders,
    people = [],
    errors = {},
    details = true,
  }: { form: ProjectFields; folders: Folder[]; people?: Person[]; errors?: Record<string, string>; details?: boolean } = $props()
</script>

<div class="grid gap-5">
  <Field id="p-name" label="Project name" error={errors.name}>
    <Input id="p-name" bind:value={form.name} placeholder="e.g. Website redesign" class="h-11 text-lg font-semibold" />
  </Field>
  <Field id="p-desc" label="Description" hint="A line or two about what this project is for (optional).">
    <Textarea id="p-desc" bind:value={form.description} rows={2} />
  </Field>
  <div class="grid gap-5 sm:grid-cols-2">
    <Field label="Icon"><IconPicker bind:value={form.icon} /></Field>
    <Field label="Color"><ColorPicker bind:value={form.color} /></Field>
  </div>
  <div class="grid gap-5 sm:grid-cols-2">
    <Field id="p-folder" label="Folder on Home">
      <Select id="p-folder" bind:value={form.folderId} options={[{ value: '', label: 'No folder' }, ...folders.map((f) => ({ value: f.id, label: f.name }))]} />
    </Field>
    <Field id="p-access" label="Who can see it" hint={form.access === 'all' ? 'Everyone in the account can find and join it.' : 'Only people you add.'}>
      <Select id="p-access" bind:value={form.access} options={[{ value: 'invite', label: 'Only people I invite' }, { value: 'all', label: 'All-access (everyone)' }]} />
    </Field>
  </div>
  {#if details}
    <div class="grid gap-5 rounded-lg border bg-muted/30 p-4 sm:grid-cols-2">
      <Field id="p-lead" label="Lead">
        <Select id="p-lead" bind:value={form.leadId} options={[{ value: '', label: 'No lead' }, ...people.map((p) => ({ value: p.id, label: p.name }))]} />
      </Field>
      <Field id="p-phase" label="Phase" hint="e.g. Discovery, Phase 2, Launch">
        <Input id="p-phase" bind:value={form.phase} />
      </Field>
      <Field id="p-start" label="Starts" error={errors.startOn}><Input id="p-start" type="date" bind:value={form.startOn} /></Field>
      <Field id="p-end" label="Ends" error={errors.endOn}><Input id="p-end" type="date" bind:value={form.endOn} /></Field>
      <Field id="p-status" label="Status">
        <Select id="p-status" bind:value={form.status} options={[
          { value: 'on_track', label: 'On track' },
          { value: 'at_risk', label: 'At risk' },
          { value: 'off_track', label: 'Off track' },
          { value: 'done', label: 'Done' },
        ]} />
      </Field>
    </div>
  {/if}
</div>
