<script lang="ts">
  import { SHORTCUTS } from '../../lib/shortcuts'
  import { ui } from '../../lib/state.svelte'
  import Dialog from '../ui/Dialog.svelte'
  import Kbd from '../ui/Kbd.svelte'

  const groups = ['Anywhere', 'Navigate', 'Personal'] as const
</script>

<Dialog bind:open={ui.shortcutsOpen} title="Keyboard shortcuts" description="Tip: hold Shift for a moment to see keycaps on screen." size="lg">
  <div class="grid gap-6 sm:grid-cols-3">
    {#each groups as g (g)}
      <div>
        <h3 class="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">{g}</h3>
        <ul class="grid gap-2">
          {#each SHORTCUTS.filter((s) => s.group === g) as s (s.keys)}
            <li class="flex items-center justify-between gap-3 text-sm">
              <span>{s.label}</span>
              <span class="flex shrink-0 gap-1">{#each s.keys.split(' ') as k (k)}<Kbd>{k}</Kbd>{/each}</span>
            </li>
          {/each}
        </ul>
      </div>
    {/each}
  </div>
</Dialog>
