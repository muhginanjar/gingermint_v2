<script lang="ts">
  import { Link, usePage } from '@inertiajs/svelte'
  import AuthLayout from '../components/AuthLayout.svelte'
  import { buttonVariants } from '../lib/variants'

  let { message = '', status = 404 }: { message?: string; status?: number } = $props()
  const page = usePage()
  const signedIn = $derived(!!(page.props as { auth?: { user: unknown } }).auth?.user)
</script>

<svelte:head><title>{status === 403 ? 'No access' : 'Not found'}</title></svelte:head>

<AuthLayout>
  <p class="text-center text-sm font-semibold text-ginger">{status}</p>
  <h1 class="mt-1 text-center text-2xl font-black tracking-tight">{status === 403 ? "You don't have access" : "We couldn't find that"}</h1>
  <p class="mt-2 text-center text-muted-foreground">
    {message && message !== 'Not found' ? message : 'It may have been moved, deleted, or you might not have access to it.'}
  </p>
  <div class="mt-6 flex justify-center">
    <Link href={signedIn ? '/home' : '/'} class={buttonVariants()}>{signedIn ? 'Back to Home' : 'Go to the start'}</Link>
  </div>
</AuthLayout>
