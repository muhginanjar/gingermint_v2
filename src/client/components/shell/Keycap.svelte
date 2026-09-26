<script lang="ts">
  /** A keyboard hint that appears while Shift is held (see AppShell). */
  import { ui } from '../../lib/state.svelte'
  let { k }: { k: string } = $props()
</script>

{#if ui.showKeycaps}
  <span
    class="pointer-events-none absolute -top-2 left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded border border-foreground/20 bg-foreground px-1 font-mono text-[10px] font-semibold leading-4 text-background shadow animate-[fade-in_80ms_ease]"
    aria-hidden="true">{k}</span
  >
{/if}
