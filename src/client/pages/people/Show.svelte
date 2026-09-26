<script lang="ts">
  import { router } from '@inertiajs/svelte'
  import type { Activity, Person } from '../../../shared/models'
  import ActivityItem from '../../components/ActivityItem.svelte'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import Avatar from '../../components/ui/Avatar.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import * as icons from '../../lib/icons'

  let { person, activity, isMe }: { person: Person; activity: Activity[]; isMe: boolean } = $props()
</script>

<AppShell tint="global" title={person.name} crumbs={[{ label: person.name }]}>
  <Sheet class="mx-auto max-w-3xl">
    <div class="flex flex-col items-center text-center">
      <Avatar {person} size={88} />
      <h1 class="mt-3 text-3xl font-black tracking-tight">{person.name}</h1>
      {#if person.title}<p class="text-muted-foreground">{person.title}</p>{/if}
      <p class="text-sm text-muted-foreground">{person.email}</p>
      <div class="mt-4 flex gap-2">
        {#if isMe}
          <Button variant="outline" href="/profile"><Icon icon={icons.Settings} /> Edit my profile</Button>
        {:else}
          <Button onclick={() => router.post('/pings', { personIds: [person.id] })}><Icon icon={icons.MessageCircle} /> Ping {person.name.split(' ')[0]}</Button>
        {/if}
        <Button variant="outline" href={`/reports/assignments?person=${person.id}`}><Icon icon={icons.ListChecks} /> Assignments</Button>
      </div>
    </div>
    <h2 class="mb-3 mt-10 font-black">Recent activity</h2>
    <ul class="grid gap-3">
      {#each activity as a (a.id)}<li><ActivityItem activity={a} /></li>{:else}<li class="text-sm text-muted-foreground">Nothing yet.</li>{/each}
    </ul>
  </Sheet>
</AppShell>
