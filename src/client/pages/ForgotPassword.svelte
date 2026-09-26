<script lang="ts">
  import { Link, useForm } from '@inertiajs/svelte'
  import AuthLayout from '../components/AuthLayout.svelte'
  import Button from '../components/ui/Button.svelte'
  import Field from '../components/ui/Field.svelte'
  import Icon from '../components/ui/Icon.svelte'
  import Input from '../components/ui/Input.svelte'
  import * as icons from '../lib/icons'

  let { status = undefined }: { status?: string } = $props()

  const form = useForm({ email: '' })

  function submit(e: SubmitEvent) {
    e.preventDefault()
    form.post('/forgot-password')
  }
</script>

<svelte:head><title>Reset your password</title></svelte:head>

<AuthLayout>
  <h1 class="text-2xl font-bold tracking-tight">Reset your password</h1>
  <p class="mt-1.5 mb-6 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>

  {#if status === 'sent'}
    <div
      class="mb-5 flex items-start gap-2.5 rounded-lg border border-green-600/20 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-300"
      role="status"
    >
      <Icon icon={icons.Mail} size={16} class="mt-0.5 shrink-0" />
      <span>If that email is registered, a reset link has been sent. Check your inbox.</span>
    </div>
  {/if}

  <form onsubmit={submit} novalidate class="grid gap-4">
    <Field id="email" label="Email" error={form.errors.email}>
      <div class="relative">
        <Icon icon={icons.Mail} size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="email"
          type="email"
          name="email"
          autocomplete="email"
          placeholder="you@company.com"
          class="h-10 pl-9"
          bind:value={form.email}
          onchange={() => form.clearErrors('email')}
        />
      </div>
    </Field>

    <Button type="submit" size="lg" class="w-full" disabled={form.processing} aria-busy={form.processing}>
      {form.processing ? 'Sending…' : 'Send reset link'}
    </Button>
  </form>

  <p class="mt-6 text-center text-sm text-muted-foreground">
    Remembered it? <Link href="/login" class="font-semibold text-link underline-offset-4 hover:underline">Back to login</Link>
  </p>
</AuthLayout>
