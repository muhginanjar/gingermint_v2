<script lang="ts">
  import { Link, router } from '@inertiajs/svelte'
  import type { SearchResult } from '../../../shared/models'
  import AppShell from '../../components/AppShell.svelte'
  import Sheet from '../../components/Sheet.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import * as icons from '../../lib/icons'
  import { formatDate } from '../../lib/time'

  let { q, results }: { q: string; results: SearchResult[] } = $props()
  let query = $state(q)
  let kind = $state('')
  const kinds = $derived([...new Set(results.map((r) => r.context.split(' · ')[0] ?? r.kind))])
  const shown = $derived(kind ? results.filter((r) => r.context.startsWith(kind)) : results)

  function mark(text: string): string {
    const esc = text.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c] ?? c)
    const needle = q.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return needle ? esc.replace(new RegExp(`(${needle})`, 'gi'), '<mark class="rounded bg-ginger-soft px-0.5 text-foreground">$1</mark>') : esc
  }
</script>

<AppShell tint="global" title="Search" crumbs={[{ label: 'Search' }]}>
  <Sheet class="mx-auto max-w-3xl">
    <form onsubmit={(e) => { e.preventDefault(); router.get(`/search?q=${encodeURIComponent(query)}`) }} class="flex h-12 items-center gap-2 rounded-lg border-2 border-ring/60 px-3 focus-within:border-ring">
      <Icon icon={icons.Search} class="text-muted-foreground" />
      <input bind:value={query} placeholder="Search everything…" aria-label="Search" class="h-full flex-1 bg-transparent text-lg outline-none" />
    </form>
    {#if q}
      <div class="mt-4 flex flex-wrap items-center gap-1.5 text-sm">
        <span class="mr-1 text-muted-foreground">{results.length} results</span>
        <button type="button" onclick={() => (kind = '')} class={`rounded-full px-2.5 py-1 text-xs font-medium ${!kind ? 'bg-foreground text-background' : 'bg-muted'}`}>All</button>
        {#each kinds as k (k)}<button type="button" onclick={() => (kind = k)} class={`rounded-full px-2.5 py-1 text-xs font-medium ${kind === k ? 'bg-foreground text-background' : 'bg-muted'}`}>{k}</button>{/each}
      </div>
      <ul class="mt-4 divide-y">
        {#each shown as r (r.kind + r.id)}
          <li class="py-3">
            <Link href={r.url} class="block text-foreground no-underline">
              <p class="font-semibold hover:underline">{@html mark(r.title || '(untitled)')}</p>
              <p class="text-xs text-muted-foreground">{r.context} · {formatDate(r.createdAt)}</p>
              {#if r.excerpt}<p class="mt-1 line-clamp-2 text-sm text-muted-foreground">{@html mark(r.excerpt)}</p>{/if}
            </Link>
          </li>
        {:else}
          <li class="py-10 text-center text-muted-foreground">No results for “{q}”.</li>
        {/each}
      </ul>
    {/if}
  </Sheet>
</AppShell>
