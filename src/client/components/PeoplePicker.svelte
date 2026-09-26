<script lang="ts">
  /** Multi-select people picker (chips + type-to-filter), used for assignees, notify lists, invites. */
  import type { Person } from '../../shared/models'
  import { cn } from '../lib/cn'
  import * as icons from '../lib/icons'
  import Avatar from './ui/Avatar.svelte'
  import Icon from './ui/Icon.svelte'

  let {
    people,
    selected = $bindable([]),
    placeholder = 'Type names…',
    single = false,
    id,
    label = 'People',
  }: { people: Person[]; selected?: number[]; placeholder?: string; single?: boolean; id?: string; label?: string } = $props()

  let q = $state('')
  let open = $state(false)
  let active = $state(0)
  let root = $state<HTMLDivElement | null>(null)

  const chosen = $derived(selected.map((sid) => people.find((p) => p.id === sid)).filter((p): p is Person => !!p))
  const options = $derived(
    people
      .filter((p) => !selected.includes(p.id))
      .filter((p) => !q.trim() || `${p.name} ${p.email}`.toLowerCase().includes(q.trim().toLowerCase()))
      .slice(0, 8),
  )

  function add(p: Person) {
    selected = single ? [p.id] : [...selected, p.id]
    q = ''
    active = 0
    if (single) open = false
  }

  function remove(pid: number) {
    selected = selected.filter((x) => x !== pid)
  }

  function onKey(e: KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      open = true
      active = Math.min(options.length - 1, active + 1)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      active = Math.max(0, active - 1)
    } else if (e.key === 'Enter') {
      const opt = options[active]
      if (open && opt) {
        e.preventDefault()
        add(opt)
      }
    } else if (e.key === 'Backspace' && !q && selected.length) {
      selected = selected.slice(0, -1)
    } else if (e.key === 'Escape' && open) {
      e.stopPropagation()
      open = false
    }
  }

  $effect(() => {
    if (!open) return
    const onDown = (e: MouseEvent) => {
      if (root && !root.contains(e.target as Node)) open = false
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  })
</script>

<div class="relative" bind:this={root}>
  <div
    class="flex min-h-9 w-full flex-wrap items-center gap-1 rounded-md border border-input bg-card px-1.5 py-1 shadow-sm focus-within:ring-2 focus-within:ring-ring"
  >
    {#each chosen as p (p.id)}
      <span class="inline-flex items-center gap-1 rounded-full bg-muted py-0.5 pl-0.5 pr-1.5 text-[13px]">
        <Avatar person={p} size={18} />
        {p.name}
        <button type="button" class="rounded-full text-muted-foreground hover:text-foreground" aria-label={`Remove ${p.name}`} onclick={() => remove(p.id)}>
          <Icon icon={icons.X} size={12} />
        </button>
      </span>
    {/each}
    {#if !single || chosen.length === 0}
      <input
        {id}
        bind:value={q}
        onfocus={() => (open = true)}
        oninput={() => {
          open = true
          active = 0
        }}
        onkeydown={onKey}
        placeholder={chosen.length ? '' : placeholder}
        aria-label={label}
        autocomplete="off"
        class="h-7 min-w-[8rem] flex-1 bg-transparent px-1.5 text-sm outline-none placeholder:text-muted-foreground"
      />
    {/if}
  </div>
  {#if open && options.length}
    <ul class="absolute z-50 mt-1 max-h-64 w-full overflow-y-auto rounded-md border bg-popover p-1 shadow-lg" role="listbox">
      {#each options as p, i (p.id)}
        <li>
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            onmousedown={(e) => {
              e.preventDefault()
              add(p)
            }}
            onmouseenter={() => (active = i)}
            class={cn('flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-left text-sm', i === active && 'bg-accent')}
          >
            <Avatar person={p} size={22} />
            <span class="flex-1 truncate">{p.name}</span>
            <span class="truncate text-xs text-muted-foreground">{p.title || p.email}</span>
          </button>
        </li>
      {/each}
    </ul>
  {/if}
</div>
