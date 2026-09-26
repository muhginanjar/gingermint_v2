<script lang="ts">
  import { Link, useForm } from '@inertiajs/svelte'
  import AuthLayout from '../components/AuthLayout.svelte'
  import Button from '../components/ui/Button.svelte'
  import Field from '../components/ui/Field.svelte'
  import Icon from '../components/ui/Icon.svelte'
  import Input from '../components/ui/Input.svelte'
  import * as icons from '../lib/icons'

  let { email, token }: { email: string; token: string } = $props()

  const form = useForm({
    email: email,
    token: token,
    password: '',
    passwordConfirmation: '',
  })
  let showPassword = $state(false)

  function submit(e: SubmitEvent) {
    e.preventDefault()
    form.post('/reset-password')
  }
</script>

<svelte:head><title>Choose a new password</title></svelte:head>

<AuthLayout>
  <h1 class="text-2xl font-bold tracking-tight">Choose a new password</h1>
  <p class="mt-1.5 mb-6 text-sm text-muted-foreground">
    Set a new password for <strong class="font-semibold text-foreground">{email}</strong>.
  </p>

  <form onsubmit={submit} novalidate class="grid gap-4">
    <Field id="password" label="New password" error={form.errors.password} hint="At least 8 characters.">
      <div class="relative">
        <Icon icon={icons.Lock} size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autocomplete="new-password"
          placeholder="New password"
          class="h-10 pl-9 pr-10"
          bind:value={form.password}
          onchange={() => form.clearErrors('password')}
        />
        <button
          type="button"
          onclick={() => (showPassword = !showPassword)}
          aria-label={showPassword ? 'Hide password' : 'Show password'}
          aria-pressed={showPassword}
          class="absolute right-1.5 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        >
          <Icon icon={showPassword ? icons.EyeOff : icons.Eye} size={16} />
        </button>
      </div>
    </Field>

    <Field
      id="passwordConfirmation"
      label="Confirm password"
      error={form.errors.passwordConfirmation}
    >
      <div class="relative">
        <Icon icon={icons.Lock} size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="passwordConfirmation"
          type={showPassword ? 'text' : 'password'}
          name="passwordConfirmation"
          autocomplete="new-password"
          placeholder="Repeat the new password"
          class="h-10 pl-9"
          bind:value={form.passwordConfirmation}
          onchange={() => form.clearErrors('passwordConfirmation')}
        />
      </div>
    </Field>

    {#if form.errors.token}
      <p class="text-xs font-medium text-destructive" role="alert">
        {form.errors.token}
      </p>
    {/if}

    <Button type="submit" size="lg" class="w-full" disabled={form.processing} aria-busy={form.processing}>
      {form.processing ? 'Saving…' : 'Save new password'}
    </Button>
  </form>

  <p class="mt-6 text-center text-sm text-muted-foreground">
    <Link href="/login" class="font-semibold text-link underline-offset-4 hover:underline">Back to login</Link>
  </p>
</AuthLayout>
