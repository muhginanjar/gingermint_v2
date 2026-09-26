<script lang="ts">
  /**
   * Hill Chart: each tracked to-do list is a dot on the hill. Left side =
   * "figuring things out", right side = "making it happen". Drag a dot to
   * update where the work stands; history is kept.
   */
  import type { HillUpdate, TodoList } from '../../shared/models'
  import { cn } from '../lib/cn'
  import { relativeTime } from '../lib/time'

  let {
    lists,
    updates = [],
    editable = true,
    onmove,
  }: { lists: TodoList[]; updates?: HillUpdate[]; editable?: boolean; onmove: (listId: number, position: number) => void } = $props()

  const W = 600
  const H = 150
  const BASE = 130
  const curve = (x: number) => BASE - 110 * Math.exp(-((x - 50) ** 2) / (2 * 17 ** 2))
  const px = (pos: number) => 20 + (pos / 100) * (W - 40)
  const path = Array.from({ length: 101 }, (_, i) => `${i === 0 ? 'M' : 'L'}${px(i).toFixed(1)},${curve(i).toFixed(1)}`).join(' ')

  const DOT = ['#e4572e', '#1d7a5f', '#2563eb', '#9333ea', '#d97706', '#db2777', '#0d9488', '#475569']
  let dragging = $state<number | null>(null)
  let live = $state<Record<number, number>>({})
  let svg = $state<SVGSVGElement | null>(null)

  const pos = (l: TodoList) => live[l.id] ?? l.hillPosition

  function toPos(e: PointerEvent): number {
    if (!svg) return 0
    const r = svg.getBoundingClientRect()
    const x = ((e.clientX - r.left) / r.width) * W
    return Math.max(0, Math.min(100, ((x - 20) / (W - 40)) * 100))
  }

  function down(e: PointerEvent, l: TodoList) {
    if (!editable) return
    dragging = l.id
    ;(e.target as Element).setPointerCapture(e.pointerId)
  }
  function move(e: PointerEvent) {
    if (dragging !== null) live = { ...live, [dragging]: toPos(e) }
  }
  function up() {
    if (dragging === null) return
    const id = dragging
    dragging = null
    const p = live[id]
    if (p !== undefined) onmove(id, Math.round(p))
  }
  function key(e: KeyboardEvent, l: TodoList) {
    if (!editable) return
    const step = e.shiftKey ? 10 : 2
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = Math.max(0, Math.min(100, pos(l) + (e.key === 'ArrowRight' ? step : -step)))
      live = { ...live, [l.id]: next }
      onmove(l.id, Math.round(next))
    }
  }
</script>

<div class="rounded-lg border bg-card p-4" id="hill">
  <svg bind:this={svg} viewBox={`0 0 ${W} ${H}`} class="w-full touch-none select-none" role="group" aria-label="Hill chart" onpointermove={move} onpointerup={up}>
    <line x1={W / 2} x2={W / 2} y1="14" y2={BASE} stroke="currentColor" class="text-border" stroke-dasharray="4 4" />
    <path d={path} fill="none" stroke="currentColor" class="text-muted-foreground/60" stroke-width="2" />
    <line x1="20" x2={W - 20} y1={BASE} y2={BASE} stroke="currentColor" class="text-border" />
    {#each lists as l, i (l.id)}
      {@const p = pos(l)}
      <g
        role="slider"
        tabindex={editable ? 0 : -1}
        aria-label={`${l.name}: ${p < 50 ? 'figuring it out' : 'making it happen'}`}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(p)}
        onpointerdown={(e) => down(e, l)}
        onkeydown={(e) => key(e, l)}
        class={cn(editable && 'cursor-grab', dragging === l.id && 'cursor-grabbing', 'outline-none [&:focus-visible>circle]:stroke-[4]')}
      >
        <circle cx={px(p)} cy={curve(p)} r="9" fill={DOT[i % DOT.length]} stroke="white" stroke-width="2" />
      </g>
    {/each}
    <text x={W * 0.25} y={H - 2} text-anchor="middle" class="fill-muted-foreground text-[11px]">Figuring things out</text>
    <text x={W * 0.75} y={H - 2} text-anchor="middle" class="fill-muted-foreground text-[11px]">Making it happen</text>
  </svg>
  <ul class="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm">
    {#each lists as l, i (l.id)}
      <li class="flex items-center gap-1.5"><span class="h-2.5 w-2.5 rounded-full" style={`background:${DOT[i % DOT.length]}`}></span>{l.name}</li>
    {/each}
  </ul>
  {#if updates.length}
    <details class="mt-3 text-sm">
      <summary class="text-muted-foreground">History</summary>
      <ul class="mt-2 grid gap-1 text-xs text-muted-foreground">
        {#each updates.slice(0, 12) as u (u.id)}
          <li>{u.person?.name ?? 'Someone'} moved <strong class="text-foreground">{u.listName}</strong> to {u.position}% · {relativeTime(u.createdAt)}</li>
        {/each}
      </ul>
    </details>
  {/if}
  {#if editable}<p class="mt-2 text-xs text-muted-foreground">Drag a dot (or focus it and use ← →) to show where the work stands.</p>{/if}
</div>
