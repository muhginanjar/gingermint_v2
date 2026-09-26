<script lang="ts">
  import type { IconNode } from 'lucide'
  import type { Snippet } from 'svelte'
  import Icon from './Icon.svelte'

  let { icon, title, children }: { icon?: IconNode; title: string; children?: Snippet } = $props()
</script>

<div class="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed px-6 py-10 text-center">
  {#if icon}<span class="mb-1 rounded-full bg-muted p-3 text-muted-foreground"><Icon {icon} size={20} /></span>{/if}
  <p class="font-semibold">{title}</p>
  {#if children}<div class="max-w-sm text-sm text-muted-foreground">{@render children()}</div>{/if}
</div>
