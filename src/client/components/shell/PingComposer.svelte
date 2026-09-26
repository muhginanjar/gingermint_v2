<script lang="ts">
  /** Start a Ping: pick people, write a first message. */
  import { router } from '@inertiajs/svelte'
  import type { Person } from '../../../shared/models'
  import { api, ApiError } from '../../lib/api'
  import { ui } from '../../lib/state.svelte'
  import Button from '../ui/Button.svelte'
  import Dialog from '../ui/Dialog.svelte'
  import Field from '../ui/Field.svelte'
  import Textarea from '../ui/Textarea.svelte'
  import PeoplePicker from '../PeoplePicker.svelte'

  let people = $state<Person[]>([])
  let selected = $state<number[]>([])
  let body = $state('')
  let error = $state('')
  let busy = $state(false)

  $effect(() => {
    if (!ui.pingOpen) return
    selected = []
    body = ''
    error = ''
    api
      .get<{ people: Person[] }>('/pings/people')
      .then((d) => (people = d.people))
      .catch(() => {})
  })

  async function send() {
    busy = true
    error = ''
    try {
      const res = await api.post<{ id: number }>('/pings', { personIds: selected, body })
      ui.pingOpen = false
      router.visit(`/pings/${res.id}`)
    } catch (e) {
      error = e instanceof ApiError ? e.message : 'Could not start the ping.'
    } finally {
      busy = false
    }
  }
</script>

<Dialog bind:open={ui.pingOpen} title="New ping" description="A private conversation with one person or a small group.">
  <div class="grid gap-3">
    <Field id="ping-people" label="To" error={error}>
      <PeoplePicker {people} bind:selected id="ping-people" placeholder="Who do you want to ping?" />
    </Field>
    <Textarea bind:value={body} rows={3} placeholder="Say hi…" aria-label="Message" />
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (ui.pingOpen = false)}>Cancel</Button>
    <Button onclick={send} disabled={busy || selected.length === 0}>Start pinging</Button>
  {/snippet}
</Dialog>
