<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Folder, Person, ProjectDetail } from '../../../shared/models'
  import ProjectForm, { type ProjectFields } from '../../components/ProjectForm.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import ProjectMark from '../../components/ProjectMark.svelte'
  import { uploadFiles } from '../../lib/api'
  import * as icons from '../../lib/icons'
  import { toast } from '../../lib/state.svelte'

  let { project, folders, people, errors = {} }: { project: ProjectDetail; folders: Folder[]; people: Person[]; errors?: Record<string, string> } = $props()

  let form = $state<ProjectFields>({
    name: project.name,
    description: project.description,
    icon: project.icon,
    color: project.color,
    folderId: project.folderId ?? '',
    leadId: project.lead?.id ?? '',
    phase: project.phase,
    status: project.status,
    startOn: project.startOn ?? '',
    endOn: project.endOn ?? '',
    access: project.access,
  })
  let logoInput = $state<HTMLInputElement | null>(null)

  function submit(e: SubmitEvent) {
    e.preventDefault()
    router.patch(`/projects/${project.id}`, { ...form, folderId: form.folderId || null, leadId: form.leadId || null })
  }

  async function onLogo(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0]
    if (!file) return
    if (!file.type.startsWith('image/')) return toast('Pick an image.', 'error')
    const [saved] = await uploadFiles([file], project.id)
    if (saved) router.post(`/projects/${project.id}/logo`, { logoUrl: saved.url }, { preserveScroll: true })
  }
</script>

<ProjectShell {project} title="Edit project" crumbs={[{ label: 'Edit' }]}>
  <div class="mx-auto max-w-2xl">
    <SheetHeader title="Edit project" />
    <div class="mb-6 flex items-center gap-4 rounded-lg border p-4">
      <ProjectMark {project} size={48} />
      <div class="flex-1 text-sm text-muted-foreground">Use a logo or avatar instead of an icon.</div>
      <input bind:this={logoInput} type="file" accept="image/*" class="hidden" onchange={onLogo} />
      <Button variant="outline" size="sm" onclick={() => logoInput?.click()}><Icon icon={icons.Upload} /> Upload logo</Button>
      {#if project.logoUrl}<Button variant="ghost" size="sm" onclick={() => router.post(`/projects/${project.id}/logo`, { logoUrl: null })}>Remove</Button>{/if}
    </div>
    <form onsubmit={submit} class="grid gap-6">
      <ProjectForm bind:form {folders} {people} {errors} />
      <div class="flex gap-2">
        <Button type="submit">Save changes</Button>
        <Button variant="ghost" href={`/projects/${project.id}`}>Cancel</Button>
      </div>
    </form>
  </div>
</ProjectShell>
