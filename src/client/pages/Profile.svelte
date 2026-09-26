<script lang="ts">
  /** Profile & settings: avatar, name/email/title, password, calendar feed, API tokens. */
  import { router, useForm, usePage } from '@inertiajs/svelte'
  import type { ApiToken } from '../../shared/models'
  import type { SharedPageProps } from '../../shared/types'
  import AppShell from '../components/AppShell.svelte'
  import Sheet from '../components/Sheet.svelte'
  import SheetHeader from '../components/SheetHeader.svelte'
  import Avatar from '../components/ui/Avatar.svelte'
  import Button from '../components/ui/Button.svelte'
  import Field from '../components/ui/Field.svelte'
  import Icon from '../components/ui/Icon.svelte'
  import Input from '../components/ui/Input.svelte'
  import { api, ApiError } from '../lib/api'
  import * as icons from '../lib/icons'
  import { toast } from '../lib/state.svelte'
  import { formatDate, relativeTime } from '../lib/time'

  let {
    title: initialTitle = '',
    tokens = [],
    feedUrl = '',
    apiBase = '',
  }: { title?: string; tokens?: ApiToken[]; feedUrl?: string; apiBase?: string } = $props()

  const page = usePage<SharedPageProps>()
  const user = $derived(page.props.auth.user)

  const info = useForm({ name: page.props.auth.user?.name ?? '', email: page.props.auth.user?.email ?? '' })
  const pass = useForm({ currentPassword: '', password: '', passwordConfirmation: '' })
  let title = $state(initialTitle)
  let tokenName = $state('')
  let newToken = $state<string | null>(null)
  let tokenList = $state<ApiToken[]>(tokens)
  let uploading = $state(false)
  let avatarInput = $state<HTMLInputElement | null>(null)

  $effect(() => {
    tokenList = tokens
  })

  function onAvatar(e: Event) {
    const target = e.target as HTMLInputElement
    const file = target.files?.[0]
    target.value = ''
    if (!file) return
    uploading = true
    const fd = new FormData()
    fd.append('avatar', file)
    fetch('/profile/avatar', { method: 'POST', body: fd })
      .then((res) => {
        if (res.status === 204) {
          toast('Avatar updated.')
          router.reload()
        } else res.text().then((t) => toast(t || 'Upload failed', 'error'))
      })
      .catch(() => toast('Network error', 'error'))
      .finally(() => (uploading = false))
  }

  async function createToken() {
    try {
      const res = await api.post<{ token: string; tokens: ApiToken[] }>('/profile/tokens', { name: tokenName })
      newToken = res.token
      tokenList = res.tokens
      tokenName = ''
    } catch (e) {
      toast(e instanceof ApiError ? e.message : 'Could not create token', 'error')
    }
  }

  async function copy(text: string) {
    await navigator.clipboard?.writeText(text)
    toast('Copied.')
  }
</script>

<AppShell tint="global" title="Profile" crumbs={[{ label: 'Profile & settings' }]}>
  {#if user}
    <Sheet class="mx-auto max-w-3xl">
      <SheetHeader title="Profile & settings" subtitle="How you appear to others, and how you connect GingerMint to other tools." />

      <section class="flex flex-wrap items-center gap-4 rounded-lg border p-4">
        <Avatar person={user} size={64} />
        <div class="min-w-0 flex-1">
          <p class="text-lg font-bold">{user.name}</p>
          <p class="text-sm text-muted-foreground">{user.email} · {user.role === 'admin' ? 'Admin' : 'Member'} since {formatDate(user.createdAt)}</p>
        </div>
        <input bind:this={avatarInput} type="file" accept="image/png,image/jpeg,image/gif,image/webp" class="hidden" onchange={onAvatar} />
        <Button variant="outline" size="sm" onclick={() => avatarInput?.click()} disabled={uploading}>
          <Icon icon={icons.Upload} /> {uploading ? 'Uploading…' : 'Change photo'}
        </Button>
      </section>

      <div class="mt-8 grid gap-8 md:grid-cols-2">
        <form class="grid content-start gap-4" onsubmit={(e) => { e.preventDefault(); info.patch('/profile') }}>
          <h2 class="text-lg font-bold">About you</h2>
          <Field id="name" label="Name" error={info.errors.name}><Input id="name" bind:value={info.name} autocomplete="name" /></Field>
          <Field id="email" label="Email" error={info.errors.email}><Input id="email" type="email" bind:value={info.email} autocomplete="email" /></Field>
          <Button type="submit" disabled={info.processing} class="justify-self-start">Save profile</Button>
        </form>
        <form class="grid content-start gap-4" onsubmit={(e) => { e.preventDefault(); router.patch('/profile/title', { title }) }}>
          <h2 class="text-lg font-bold">Your title</h2>
          <Field id="title" label="Job title or role" hint="Shown next to your name around the account.">
            <Input id="title" bind:value={title} placeholder="e.g. Designer, Account manager" />
          </Field>
          <Button type="submit" variant="outline" class="justify-self-start">Save title</Button>
        </form>
      </div>

      <form class="mt-10 grid max-w-md gap-4" onsubmit={(e) => { e.preventDefault(); pass.post('/profile/password', { onSuccess: () => pass.reset() }) }}>
        <h2 class="text-lg font-bold">Change password</h2>
        <Field id="currentPassword" label="Current password" error={pass.errors.currentPassword}>
          <Input id="currentPassword" type="password" bind:value={pass.currentPassword} autocomplete="current-password" />
        </Field>
        <Field id="password" label="New password" error={pass.errors.password} hint="At least 8 characters.">
          <Input id="password" type="password" bind:value={pass.password} autocomplete="new-password" />
        </Field>
        <Field id="passwordConfirmation" label="Confirm new password" error={pass.errors.passwordConfirmation}>
          <Input id="passwordConfirmation" type="password" bind:value={pass.passwordConfirmation} autocomplete="new-password" />
        </Field>
        <Button type="submit" disabled={pass.processing} class="justify-self-start">Update password</Button>
      </form>

      {#if feedUrl}
        <section class="mt-10">
          <h2 class="flex items-center gap-2 text-lg font-bold"><Icon icon={icons.CalendarDays} /> Calendar subscription</h2>
          <p class="mt-1 text-sm text-muted-foreground">Subscribe from Google Calendar, Apple Calendar or Outlook to see your events and assignments there. Keep this link private.</p>
          <div class="mt-3 flex gap-2">
            <Input value={feedUrl} readonly aria-label="Calendar feed URL" class="font-mono text-xs" />
            <Button variant="outline" onclick={() => copy(feedUrl)}><Icon icon={icons.Copy} /> Copy</Button>
          </div>
          <button type="button" class="mt-2 text-xs text-muted-foreground underline hover:text-foreground" onclick={() => confirm('Create a new link? The old one will stop working.') && router.post('/calendar/rotate')}>Reset link</button>
        </section>
      {/if}

      <section class="mt-10">
        <h2 class="flex items-center gap-2 text-lg font-bold"><Icon icon={icons.KeyRound} /> API tokens</h2>
        <p class="mt-1 text-sm text-muted-foreground">
          Let scripts, a CLI, or an AI agent act as you through the JSON API. Tokens have your permissions — revoke any you no longer use.
        </p>
        {#if newToken}
          <div class="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700 dark:bg-amber-950/40">
            <p class="font-semibold">Copy your new token now — you won't see it again.</p>
            <div class="mt-2 flex gap-2">
              <Input value={newToken} readonly aria-label="New API token" class="font-mono text-xs" />
              <Button variant="outline" onclick={() => copy(newToken ?? '')}><Icon icon={icons.Copy} /> Copy</Button>
            </div>
            <pre class="mt-2 overflow-x-auto rounded bg-foreground/90 p-2 font-mono text-[11px] text-background">curl -H "Authorization: Bearer {newToken}" {apiBase}/projects</pre>
          </div>
        {/if}
        <form class="mt-3 flex max-w-md gap-2" onsubmit={(e) => { e.preventDefault(); void createToken() }}>
          <Input bind:value={tokenName} placeholder="Token name, e.g. “Claude agent”" aria-label="Token name" />
          <Button type="submit" disabled={!tokenName.trim()}>Create token</Button>
        </form>
        <ul class="mt-4 divide-y rounded-md border">
          {#each tokenList as t (t.id)}
            <li class="flex items-center gap-3 px-3 py-2.5 text-sm">
              <Icon icon={icons.KeyRound} class="text-muted-foreground" />
              <span class="flex-1 font-medium">{t.name}</span>
              <span class="text-xs text-muted-foreground">{t.lastUsedAt ? `Used ${relativeTime(t.lastUsedAt)}` : 'Never used'}</span>
              <Button size="xs" variant="ghost" class="text-destructive" onclick={() => confirm(`Revoke “${t.name}”?`) && router.delete(`/profile/tokens/${t.id}`)}>Revoke</Button>
            </li>
          {:else}
            <li class="px-3 py-3 text-sm text-muted-foreground">No tokens yet.</li>
          {/each}
        </ul>
        {#if apiBase}
          <details class="mt-3 text-sm">
            <summary class="text-link">API endpoints</summary>
            <ul class="mt-2 grid gap-1 font-mono text-xs text-muted-foreground">
              <li>GET {apiBase}/me · /projects · /projects/:id</li>
              <li>GET/POST {apiBase}/projects/:id/todos · POST …/todos/:todoId/complete</li>
              <li>GET/POST {apiBase}/projects/:id/messages</li>
              <li>POST {apiBase}/comments {'{'} type, id, body {'}'}</li>
              <li>GET {apiBase}/activity · /search?q= · /assignments</li>
            </ul>
          </details>
        {/if}
      </section>
    </Sheet>
  {/if}
</AppShell>
