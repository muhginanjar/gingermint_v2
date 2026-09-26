<script lang="ts">
  import { cn } from '../../lib/cn'
  import * as icons from '../../lib/icons'
  import { dismissToast, toasts } from '../../lib/state.svelte'
  import Icon from '../ui/Icon.svelte'
</script>

<div class="pointer-events-none fixed inset-x-0 top-3 z-[100] flex flex-col items-center gap-2 px-3" aria-live="polite">
  {#each toasts.items as t (t.id)}
    <div
      class={cn(
        'pointer-events-auto flex max-w-md items-center gap-2 rounded-lg border px-4 py-2.5 text-sm font-medium shadow-lg animate-[slide-up_160ms_ease]',
        t.kind === 'error' ? 'border-destructive/30 bg-destructive text-destructive-foreground' : 'bg-foreground text-background',
      )}
      role={t.kind === 'error' ? 'alert' : 'status'}
    >
      <Icon icon={t.kind === 'error' ? icons.TriangleAlert : icons.Check} />
      <span>{t.text}</span>
      <button type="button" class="ml-1 opacity-70 hover:opacity-100" aria-label="Dismiss" onclick={() => dismissToast(t.id)}>
        <Icon icon={icons.X} size={14} />
      </button>
    </div>
  {/each}
</div>
