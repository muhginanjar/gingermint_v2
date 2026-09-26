<script lang="ts">
  /** Webhooks (third-party integrations) + the project's email-in address. */
  import { router } from '@inertiajs/svelte'
  import type { ProjectDetail, Webhook } from '../../../shared/models'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import SheetHeader from '../../components/SheetHeader.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import Switch from '../../components/ui/Switch.svelte'
  import * as icons from '../../lib/icons'
  import { relativeTime } from '../../lib/time'

  let { project, webhooks, inboundUrl, errors = {} }: { project: ProjectDetail; webhooks: Webhook[]; inboundUrl: string; errors?: Record<string, string> } = $props()
  let url = $state('')
</script>

<ProjectShell {project} title="Integrations" crumbs={[{ label: 'Integrations' }]}>
  <SheetHeader title="Integrations" subtitle="Connect this project to the rest of your tools." />

  <section class="mb-10">
    <h2 class="flex items-center gap-2 text-lg font-bold"><Icon icon={icons.Mail} /> Forward emails into this project</h2>
    <p class="mt-1 text-sm text-muted-foreground">
      Point your inbound-mail provider (Postmark, Mailgun, SendGrid…) at the webhook below, or forward to the address. Emails land in <a href="/everything/forwards" class="text-link underline">Everything → Forwarded emails</a>.
    </p>
    <div class="mt-3 grid gap-2 sm:grid-cols-2">
      <Input value={project.inboundEmail} readonly aria-label="Inbound email address" class="font-mono text-xs" />
      <Input value={inboundUrl} readonly aria-label="Inbound webhook URL" class="font-mono text-xs" />
    </div>
  </section>

  <section>
    <h2 class="flex items-center gap-2 text-lg font-bold"><Icon icon={icons.Webhook} /> Webhooks</h2>
    <p class="mt-1 text-sm text-muted-foreground">We'll POST a JSON payload to each URL whenever something happens in this project (new message, to-do completed, comment…).</p>
    <form class="mt-3 flex gap-2" onsubmit={(e) => { e.preventDefault(); router.post(`/projects/${project.id}/webhooks`, { url }, { preserveScroll: true, onSuccess: () => (url = '') }) }}>
      <Field id="hook-url" error={errors.url} class="flex-1"><Input id="hook-url" bind:value={url} placeholder="https://hooks.example.com/gingermint" /></Field>
      <Button type="submit" disabled={!url.trim()}>Add webhook</Button>
    </form>
    <ul class="mt-4 divide-y rounded-md border">
      {#each webhooks as w (w.id)}
        <li class="flex items-center gap-3 px-3 py-2.5 text-sm">
          <Switch checked={w.active} label="Active" onchange={(v) => router.patch(`/projects/${project.id}/webhooks/${w.id}`, { active: v }, { preserveScroll: true })} />
          <span class="min-w-0 flex-1 truncate font-mono text-xs">{w.url}</span>
          <span class="text-xs text-muted-foreground">
            {w.lastStatus === null ? 'Not called yet' : w.lastStatus === 0 ? 'Last call failed' : `Last: HTTP ${w.lastStatus}`} · added {relativeTime(w.createdAt)}
          </span>
          <Button size="xs" variant="ghost" class="text-destructive" onclick={() => confirm('Remove this webhook?') && router.delete(`/projects/${project.id}/webhooks/${w.id}`, { preserveScroll: true })}>Remove</Button>
        </li>
      {:else}
        <li class="px-3 py-3 text-sm text-muted-foreground">No webhooks yet.</li>
      {/each}
    </ul>
  </section>
</ProjectShell>
