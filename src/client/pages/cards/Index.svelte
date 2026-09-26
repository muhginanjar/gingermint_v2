<script lang="ts">
  /**
   * Card Table: Triage across the top, workflow columns (with an On-hold
   * zone each), and collapsible "Not now" / "Done" on the right. Drag cards
   * between any of them; drop onto a card to place it before that card.
   */
  import { router } from '@inertiajs/svelte'
  import type { CardColumn, Person, ProjectRef } from '../../../shared/models'
  import CardTile from '../../components/CardTile.svelte'
  import ColorPicker from '../../components/ColorPicker.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Button from '../../components/ui/Button.svelte'
  import Dialog from '../../components/ui/Dialog.svelte'
  import Field from '../../components/ui/Field.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import Input from '../../components/ui/Input.svelte'
  import MenuItem from '../../components/ui/MenuItem.svelte'
  import Popover from '../../components/ui/Popover.svelte'
  import Select from '../../components/ui/Select.svelte'
  import PeoplePicker from '../../components/PeoplePicker.svelte'
  import { cn } from '../../lib/cn'
  import { colorOf } from '../../lib/colors'
  import * as icons from '../../lib/icons'

  let { project, columns, people }: { project: ProjectRef; columns: CardColumn[]; people: Person[] } = $props()

  let filter = $state('')
  let dragging = $state<number | null>(null)
  let over = $state<string | null>(null)
  let expanded = $state<Record<number, boolean>>({})
  let adding = $state<number | null>(null)
  let quickTitle = $state('')
  let newCard = $state(false)
  let nc = $state({ title: '', columnId: 0, dueOn: '', assigneeIds: [] as number[] })
  let colDialog = $state<{ id: number | null; name: string; color: string } | null>(null)

  const q = $derived(filter.trim().toLowerCase())
  const visible = (col: CardColumn) => col.cards.filter((c) => !q || `${c.title} ${c.body} ${c.assignees.map((a) => a.name).join(' ')}`.toLowerCase().includes(q))
  const triage = $derived(columns.find((c) => c.kind === 'triage'))
  const flow = $derived(columns.filter((c) => c.kind === 'column'))
  const side = $derived(columns.filter((c) => c.kind === 'not_now' || c.kind === 'done'))

  function move(columnId: number, onHold = false, beforeId: number | null = null) {
    const id = dragging
    dragging = null
    over = null
    if (id === null) return
    router.post(`/projects/${project.id}/cards/${id}/move`, { columnId, onHold, beforeId }, { preserveScroll: true })
  }

  const zone = (key: string, columnId: number, onHold = false) => ({
    ondragover: (e: DragEvent) => {
      if (dragging === null) return
      e.preventDefault()
      over = key
    },
    ondragleave: (e: DragEvent) => {
      if (!(e.currentTarget as Element).contains(e.relatedTarget as Node)) over = over === key ? null : over
    },
    ondrop: (e: DragEvent) => {
      e.preventDefault()
      const target = (e.target as Element).closest('[data-card-id]')
      const beforeId = target ? Number(target.getAttribute('data-card-id')) : null
      move(columnId, onHold, beforeId && beforeId !== dragging ? beforeId : null)
    },
  })

  function quickAdd(columnId: number) {
    if (!quickTitle.trim()) return
    router.post(`/projects/${project.id}/cards`, { columnId, title: quickTitle }, { preserveScroll: true, onSuccess: () => (quickTitle = '') })
  }

  function openNewCard() {
    nc = { title: '', columnId: triage?.id ?? flow[0]?.id ?? 0, dueOn: '', assigneeIds: [] }
    newCard = true
  }

  function saveColumn() {
    if (!colDialog) return
    const data = { name: colDialog.name, color: colDialog.color }
    const opts = { preserveScroll: true, onSuccess: () => (colDialog = null) }
    if (colDialog.id) router.patch(`/projects/${project.id}/cards/columns/${colDialog.id}`, data, opts)
    else router.post(`/projects/${project.id}/cards/columns`, data, opts)
  }
</script>

{#snippet adder(col: CardColumn)}
  {#if adding === col.id}
    <form onsubmit={(e) => { e.preventDefault(); quickAdd(col.id) }} class="mt-1.5 grid gap-1.5">
      <Input bind:value={quickTitle} placeholder="Card title…" aria-label="Card title" autofocus onkeydown={(e: KeyboardEvent) => e.key === 'Escape' && (adding = null)} />
      <div class="flex gap-1.5"><Button size="xs" type="submit">Add card</Button><Button size="xs" variant="ghost" onclick={() => (adding = null)}>Cancel</Button></div>
    </form>
  {:else}
    <button type="button" onclick={() => { adding = col.id; quickTitle = '' }} class="mt-1.5 w-full rounded px-2 py-1 text-left text-xs font-medium text-muted-foreground hover:bg-card hover:text-foreground">+ Add a card</button>
  {/if}
{/snippet}

{#snippet colMenu(col: CardColumn)}
  <Popover align="end" contentClass="w-44">
    {#snippet trigger({ toggle })}
      <button type="button" onclick={toggle} class="flex h-6 w-6 items-center justify-center rounded border bg-card text-muted-foreground hover:text-foreground" aria-label={`${col.name} options`}><Icon icon={icons.Ellipsis} size={13} /></button>
    {/snippet}
    {#snippet children({ close })}
      <MenuItem icon={icons.Pencil} onclick={() => { close(); colDialog = { id: col.id, name: col.name, color: col.color } }}>Rename & color</MenuItem>
      {#if col.kind === 'column'}
        <MenuItem icon={icons.Trash} danger onclick={() => { close(); confirm(`Remove “${col.name}”? Its cards move to Triage.`) && router.delete(`/projects/${project.id}/cards/columns/${col.id}`, { preserveScroll: true }) }}>Remove column</MenuItem>
      {/if}
    {/snippet}
  </Popover>
{/snippet}

<ProjectShell {project} tool="card_table" wide sheet={false}>
  <section class="rounded-xl border bg-card p-4 shadow-sheet sm:p-6">
    <div class="mb-4 flex flex-wrap items-center gap-2">
      <h1 class="mr-2 text-[28px] font-black tracking-tight">Card Table</h1>
      <Button size="sm" onclick={openNewCard}><Icon icon={icons.Plus} /> Add a card</Button>
      <input bind:value={filter} placeholder="Filter…" aria-label="Filter cards" class="h-8 w-40 rounded-md border border-input bg-card px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" />
    </div>

    {#if triage}
      <div class={cn('mb-4 rounded-lg border bg-muted/40 p-3 transition-colors', over === 'triage' && 'ring-2 ring-primary')} {...zone('triage', triage.id)}>
        <div class="mb-2 flex items-center justify-between">
          <h2 class="text-sm font-bold">{triage.name} <span class="font-normal text-muted-foreground">({triage.cards.length})</span></h2>
          {@render colMenu(triage)}
        </div>
        <div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {#each visible(triage) as c (c.id)}<CardTile card={c} projectId={project.id} ondragstart={() => (dragging = c.id)} dragging={dragging === c.id} />{/each}
        </div>
        {@render adder(triage)}
      </div>
    {/if}

    <div class="flex gap-3 overflow-x-auto pb-2">
      {#each flow as col (col.id)}
        {@const cards = visible(col)}
        {@const active = cards.filter((c) => !c.onHold)}
        {@const held = cards.filter((c) => c.onHold)}
        <div class={cn('flex w-[272px] shrink-0 flex-col rounded-lg border-t-4 p-2.5', colorOf(col.color).border, colorOf(col.color).soft)}>
          <div class="mb-2 flex items-center justify-between px-0.5">
            <h2 class="text-sm font-bold">{col.name} <span class="font-normal text-muted-foreground">({col.cards.length})</span></h2>
            {@render colMenu(col)}
          </div>
          <div class={cn('grid min-h-[40px] content-start gap-2 rounded-md transition-colors', over === `c${col.id}` && 'bg-card/60 ring-2 ring-primary/50')} {...zone(`c${col.id}`, col.id)}>
            {#each active as c (c.id)}<CardTile card={c} projectId={project.id} ondragstart={() => (dragging = c.id)} dragging={dragging === c.id} />{/each}
          </div>
          {@render adder(col)}
          <div class={cn('mt-3 rounded-md border border-dashed border-foreground/15 p-2 transition-colors', over === `h${col.id}` && 'bg-card/60 ring-2 ring-primary/50')} {...zone(`h${col.id}`, col.id, true)}>
            {#if held.length}
              <p class="mb-1.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">On hold</p>
              <div class="grid gap-2">{#each held as c (c.id)}<CardTile card={c} projectId={project.id} ondragstart={() => (dragging = c.id)} dragging={dragging === c.id} />{/each}</div>
            {:else}
              <p class="text-center text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Nothing's on hold</p>
            {/if}
          </div>
        </div>
      {/each}

      <button type="button" onclick={() => (colDialog = { id: null, name: '', color: 'blue' })} class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-link text-white shadow hover:opacity-90" aria-label="Add a column" title="Add a column">
        <Icon icon={icons.Plus} />
      </button>

      {#each side as col (col.id)}
        {#if expanded[col.id]}
          <div class={cn('flex w-[272px] shrink-0 flex-col rounded-lg border-t-4 p-2.5', colorOf(col.color).border, colorOf(col.color).soft)}>
            <div class="mb-2 flex items-center justify-between">
              <button type="button" class="text-sm font-bold hover:underline" onclick={() => (expanded = { ...expanded, [col.id]: false })}>{col.name} <span class="font-normal text-muted-foreground">({col.cards.length})</span> ›</button>
              {@render colMenu(col)}
            </div>
            <div class={cn('grid min-h-[40px] content-start gap-2 rounded-md', over === `s${col.id}` && 'ring-2 ring-primary/50')} {...zone(`s${col.id}`, col.id)}>
              {#each visible(col) as c (c.id)}<CardTile card={c} projectId={project.id} ondragstart={() => (dragging = c.id)} dragging={dragging === c.id} />{/each}
            </div>
          </div>
        {:else}
          <button
            type="button"
            onclick={() => (expanded = { ...expanded, [col.id]: true })}
            class={cn('flex w-11 shrink-0 flex-col items-center gap-2 rounded-lg border-t-4 py-3 text-xs font-bold uppercase tracking-wider', colorOf(col.color).border, colorOf(col.color).soft, over === `s${col.id}` && 'ring-2 ring-primary')}
            {...zone(`s${col.id}`, col.id)}
            aria-label={`${col.name}, ${col.cards.length} cards — expand`}
          >
            <span class="text-muted-foreground">({col.cards.length})</span>
            <span class="[writing-mode:vertical-rl]">{col.name}</span>
          </button>
        {/if}
      {/each}
    </div>
  </section>
</ProjectShell>

<Dialog bind:open={newCard} title="Add a card">
  <div class="grid gap-4">
    <Field id="nc-title" label="Title"><Input id="nc-title" bind:value={nc.title} /></Field>
    <div class="grid gap-4 sm:grid-cols-2">
      <Field id="nc-col" label="Column"><Select id="nc-col" bind:value={nc.columnId} options={columns.map((c) => ({ value: c.id, label: c.name }))} /></Field>
      <Field id="nc-due" label="Due on"><Input id="nc-due" type="date" bind:value={nc.dueOn} /></Field>
    </div>
    <Field id="nc-people" label="Assigned to"><PeoplePicker {people} bind:selected={nc.assigneeIds} id="nc-people" /></Field>
  </div>
  {#snippet footer()}
    <Button variant="outline" onclick={() => (newCard = false)}>Cancel</Button>
    <Button disabled={!nc.title.trim()} onclick={() => router.post(`/projects/${project.id}/cards`, { ...nc, dueOn: nc.dueOn || null }, { preserveScroll: true, onSuccess: () => (newCard = false) })}>Add this card</Button>
  {/snippet}
</Dialog>

<Dialog open={colDialog !== null} title={colDialog?.id ? 'Edit column' : 'Add a column'} onclose={() => (colDialog = null)}>
  {#if colDialog}
    <div class="grid gap-4">
      <Field id="col-name" label="Name"><Input id="col-name" bind:value={colDialog.name} placeholder="e.g. Client Approval" /></Field>
      <Field label="Color"><ColorPicker bind:value={colDialog.color} /></Field>
    </div>
  {/if}
  {#snippet footer()}
    <Button variant="outline" onclick={() => (colDialog = null)}>Cancel</Button>
    <Button onclick={saveColumn} disabled={!colDialog?.name.trim()}>Save</Button>
  {/snippet}
</Dialog>
