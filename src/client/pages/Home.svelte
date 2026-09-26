<script lang="ts">
  /** Public landing (CDN-cacheable). Identity comes from /api/session, not props. */
  import { Link } from '@inertiajs/svelte'
  import Brand from '../components/Brand.svelte'
  import Icon from '../components/ui/Icon.svelte'
  import { session } from '../session'
  import * as icons from '../lib/icons'
  import { buttonVariants } from '../lib/variants'

  const s = $derived($session)

  const TOOLS = [
    { icon: icons.Megaphone, name: 'Message Board', text: 'Announcements and discussions that stay attached to their topic.' },
    { icon: icons.CircleCheck, name: 'To-dos', text: 'Lists, loose to-dos, subtasks, assignees, due dates, and Hill Charts.' },
    { icon: icons.SquareKanban, name: 'Card Table', text: 'Move work through Triage, stages, Not now and Done.' },
    { icon: icons.Folder, name: 'Docs & Files', text: 'Documents, uploads, folders and cloud links in one place.' },
    { icon: icons.MessagesSquare, name: 'Chat & Pings', text: 'Real-time project chat, private pings, voice notes.' },
    { icon: icons.CalendarDays, name: 'Schedule', text: 'Every event and deadline, per project and across all of them.' },
  ]
</script>

<svelte:head><title>GingerMint — projects, calm</title></svelte:head>

<div class="min-h-screen bg-tint-home">
  <header class="mx-auto flex max-w-6xl items-center justify-between px-5 py-5">
    <Brand size={32} wordmark />
    <nav class="flex items-center gap-2">
      {#if s.user}
        <Link href="/home" class={buttonVariants()}>Open GingerMint</Link>
      {:else}
        <Link href="/login" class={buttonVariants({ variant: 'ghost' })}>Log in</Link>
        <Link href="/register" class={buttonVariants()}>Start free</Link>
      {/if}
    </nav>
  </header>

  <main class="mx-auto max-w-6xl px-5 pb-24">
    <section class="grid items-center gap-10 py-12 md:grid-cols-[1.1fr_1fr] md:py-20">
      <div>
        <h1 class="text-4xl font-black leading-[1.05] tracking-tight sm:text-6xl">One place for every project, every person, every “where was that?”</h1>
        <p class="mt-5 max-w-xl text-lg text-muted-foreground">
          GingerMint puts messages, to-dos, docs, schedules and chat inside each project — and gives you one Home, one Jump menu and
          one “New for you” to keep all of it in reach.
        </p>
        <div class="mt-8 flex flex-wrap gap-3">
          <Link href={s.user ? '/home' : '/register'} class={buttonVariants({ size: 'lg' })}>{s.user ? 'Go to Home' : 'Create your account'}</Link>
          <span class="flex items-center gap-1.5 text-sm text-muted-foreground"><Icon icon={icons.Keyboard} /> Press Shift J anywhere to jump</span>
        </div>
      </div>
      <div class="rounded-2xl border bg-card p-4 shadow-sheet" aria-hidden="true">
        <p class="mb-3 text-sm font-bold">Card Table</p>
        <div class="grid grid-cols-3 gap-2">
          {#each [['Triage', 'bg-stone-400', 3], ['Drafting', 'bg-orange-500', 2], ['Review', 'bg-sky-500', 2]] as [name, color, n] (name)}
            <div class="rounded-md bg-muted/60 p-2">
              <p class="mb-2 flex items-center gap-1.5 text-xs font-semibold"><span class={`h-2 w-2 rounded-full ${color}`}></span>{name}</p>
              {#each Array(n) as _, i (i)}
                <div class="mb-1.5 h-9 rounded border bg-card"></div>
              {/each}
            </div>
          {/each}
        </div>
      </div>
    </section>

    <section class="grid gap-px overflow-hidden rounded-xl border bg-border sm:grid-cols-2 lg:grid-cols-3">
      {#each TOOLS as t (t.name)}
        <div class="bg-card p-6">
          <Icon icon={t.icon} size={22} class="text-primary" />
          <h2 class="mt-3 font-bold">{t.name}</h2>
          <p class="mt-1 text-sm text-muted-foreground">{t.text}</p>
        </div>
      {/each}
    </section>
  </main>
</div>
