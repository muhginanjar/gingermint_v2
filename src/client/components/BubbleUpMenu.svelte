<script lang="ts">
  /**
   * Bubble Up: hide something now and have it resurface in New for You
   * later today / tomorrow / this weekend / next week / on a chosen day.
   * Times are computed in the viewer's timezone and sent as ISO.
   */
  import type { Snippet } from 'svelte'
  import { bubbleUpAt, todayYmd, addDaysYmd, localDate } from '../lib/time'
  import * as icons from '../lib/icons'
  import Popover from './ui/Popover.svelte'
  import MenuItem from './ui/MenuItem.svelte'
  import MenuLabel from './ui/MenuLabel.svelte'
  import Icon from './ui/Icon.svelte'
  import { buttonVariants } from '../lib/variants'

  let {
    onpick,
    align = 'end',
    side = 'bottom',
    button,
  }: {
    onpick: (iso: string) => void
    align?: 'start' | 'end'
    side?: 'top' | 'bottom'
    /** Custom trigger; defaults to a "Bubble up" ghost button. */
    button?: Snippet<[{ toggle: () => void; open: boolean }]>
  } = $props()

  let open = $state(false)
  let custom = $state(addDaysYmd(todayYmd(), 2))

  function pick(iso: string) {
    open = false
    onpick(iso)
  }

  function pickCustom() {
    const d = localDate(custom)
    d.setHours(9, 0, 0, 0)
    pick(d.toISOString())
  }
</script>

<Popover bind:open {align} {side} contentClass="w-60">
  {#snippet trigger({ toggle, open: isOpen })}
    {#if button}
      {@render button({ toggle, open: isOpen })}
    {:else}
      <button type="button" class={buttonVariants({ variant: 'ghost', size: 'sm' })} onclick={toggle} aria-expanded={isOpen}>
        <Icon icon={icons.ClockArrowUp} /> Bubble up
      </button>
    {/if}
  {/snippet}
  {#snippet children()}
    <MenuLabel>Bubble this up…</MenuLabel>
    <MenuItem icon={icons.Clock} onclick={() => pick(bubbleUpAt('later_today'))}>Later today</MenuItem>
    <MenuItem icon={icons.Sun} onclick={() => pick(bubbleUpAt('tomorrow'))}>Tomorrow morning</MenuItem>
    <MenuItem icon={icons.Calendar} onclick={() => pick(bubbleUpAt('weekend'))}>This weekend</MenuItem>
    <MenuItem icon={icons.CalendarDays} onclick={() => pick(bubbleUpAt('next_week'))}>Next week</MenuItem>
    <div class="mt-1 flex items-center gap-1.5 border-t px-2 pb-1 pt-2">
      <input
        type="date"
        bind:value={custom}
        min={addDaysYmd(todayYmd(), 1)}
        aria-label="Pick a day"
        class="h-8 min-w-0 flex-1 rounded-md border border-input bg-card px-2 text-sm"
      />
      <button type="button" class={buttonVariants({ size: 'xs' })} onclick={pickCustom}>Set</button>
    </div>
  {/snippet}
</Popover>
