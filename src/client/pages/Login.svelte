<script lang="ts">
  import { Link, useForm } from '@inertiajs/svelte'
  import AuthLayout from '../components/AuthLayout.svelte'
  import Button from '../components/ui/Button.svelte'
  import Field from '../components/ui/Field.svelte'
  import Icon from '../components/ui/Icon.svelte'
  import Input from '../components/ui/Input.svelte'
  import * as icons from '../lib/icons'

  let { googleEnabled = false, notice = null }: { googleEnabled?: boolean; notice?: string | null } = $props()

  const form = useForm({ email: '', password: '' })
  let showPassword = $state(false)

  function submit(e: SubmitEvent) {
    e.preventDefault()
    form.post('/login')
  }
</script>

<svelte:head><title>Log in to GingerMint</title></svelte:head>

<AuthLayout>
  <h1 class="text-2xl font-bold tracking-tight">Welcome back</h1>
  <p class="mt-1.5 mb-6 text-sm text-muted-foreground">Log in to pick up where you left off.</p>

  {#if notice}
    <div
      class="mb-5 flex items-start gap-2.5 rounded-lg border border-green-600/20 bg-green-600/10 px-4 py-3 text-sm text-green-700 dark:text-green-300"
      role="status"
    >
      <Icon icon={icons.CircleCheck} size={16} class="mt-0.5 shrink-0" />
      <span>{notice}</span>
    </div>
  {/if}

  {#if googleEnabled}
    <Button href="/auth/google" external variant="outline" size="lg" class="w-full">
      <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
        <path fill="#4285F4" d="M23.49 12.27c0-.79-.07-1.54-.19-2.27H12v4.51h6.47c-.29 1.48-1.14 2.73-2.4 3.58v3h3.86c2.26-2.09 3.56-5.17 3.56-8.82z" />
        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.86-3c-1.08.72-2.45 1.16-4.07 1.16-3.13 0-5.78-2.11-6.73-4.96H1.29v3.09C3.26 21.3 7.31 24 12 24z" />
        <path fill="#FBBC05" d="M5.27 14.29c-.25-.72-.38-1.49-.38-2.29s.14-1.57.38-2.29V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.98-3.09z" />
        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.98 3.09C6.22 6.86 8.87 4.75 12 4.75z" />
      </svg>
      Continue with Google
    </Button>
    <div class="my-5 flex items-center gap-3 text-xs text-muted-foreground">
      <span class="h-px flex-1 bg-border"></span>
      or continue with email
      <span class="h-px flex-1 bg-border"></span>
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

    <Field id="password" label="Password" error={form.errors.password}>
      <div class="relative">
        <Icon icon={icons.Lock} size={16} class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="password"
          type={showPassword ? 'text' : 'password'}
          name="password"
          autocomplete="current-password"
          placeholder="Your password"
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

    <div class="flex justify-end">
      <Link href="/forgot-password" class="text-sm font-medium text-link underline-offset-4 hover:underline">Forgot your password?</Link>
    </div>

    <Button type="submit" size="lg" class="w-full" disabled={form.processing} aria-busy={form.processing}>
      {form.processing ? 'Signing in…' : 'Sign in'}
    </Button>
  </form>

  <p class="mt-6 text-center text-sm text-muted-foreground">
    No account yet? <Link href="/register" class="font-semibold text-link underline-offset-4 hover:underline">Create one</Link>
  </p>
</AuthLayout>
