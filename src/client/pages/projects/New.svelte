<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Folder, ProjectSummary } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import ProjectForm, { type ProjectFields } from '../../components/ProjectForm.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'

  let {
    folders,
    templates,
    templateId = null,
    errors = {},
  }: { folders: Folder[]; templates: ProjectSummary[]; templateId?: number | null; errors?: Record<string, string> } = $props()

  let form = $state<ProjectFields>({
    name: '', description: '', icon: '', color: 'blue', folderId: '', leadId: '', phase: '', status: 'on_track', startOn: '', endOn: '', access: 'invite',
  })
  let template = $state<number | null>(templateId)
  let busy = $state(false)

  function submit(e: SubmitEvent) {
    e.preventDefault()
    busy = true
    router.post('/projects', { ...form, folderId: form.folderId || null, templateId: template }, { onFinish: () => (busy = false) })
  }
</script>

<AppShell tint="home" title="New project" crumbs={[{ label: 'New project' }]}>
  <Sheet class="mx-auto max-w-2xl">
    <SheetHeader title="Make a new project" subtitle="You can add tools, people and dates any time after it's created." />
    <form onsubmit={submit} class="grid gap-6">
      {#if templates.length}
        <fieldset>
          <legend class="mb-2 text-sm font-medium">Start from</legend>
          <div class="grid gap-2 sm:grid-cols-2">
            <button type="button" onclick={() => (template = null)} class={cn('rounded-lg border p-3 text-left text-sm', template === null ? 'border-primary bg-accent' : 'hover:bg-muted')}>
              <span class="font-semibold">A blank project</span>
              <span class="block text-muted-foreground">Message Board, To-dos, Docs, Chat, Schedule, Card Table.</span>
            </button>
            {#each templates as t (t.id)}
              <button type="button" onclick={() => (template = t.id)} class={cn('rounded-lg border p-3 text-left text-sm', template === t.id ? 'border-primary bg-accent' : 'hover:bg-muted')}>
                <span class="flex items-center gap-1.5 font-semibold"><Icon icon={icons.Copy} size={14} />{t.name}</span>
                <span class="block line-clamp-2 text-muted-foreground">{t.description || 'Template'}</span>
              </button>
            {/each}
          </div>
        </fieldset>
      {/if}
      <ProjectForm bind:form {folders} {errors} details={false} />
      <div class="flex gap-2">
        <Button type="submit" size="lg" disabled={busy || !form.name.trim()}>{busy ? 'Creating…' : 'Create this project'}</Button>
        <Button variant="ghost" size="lg" href="/home">Cancel</Button>
      </div>
    </form>
  </Sheet>
</AppShell>
