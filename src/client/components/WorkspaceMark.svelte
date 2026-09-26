<script lang="ts">
  /** A workspace's logo, or its initial on a stable color. */
  import { cn } from '../lib/cn'
  import { avatarBg } from '../lib/colors'

  let { workspace, size = 28, class: className = '' }: { workspace: { id: number; name: string; logoUrl: string | null }; size?: number; class?: string } = $props()
</script>

{#if workspace.logoUrl}
  <img src={workspace.logoUrl} alt="" width={size} height={size} class={cn('shrink-0 rounded-lg object-cover', className)} style={`width:${size}px;height:${size}px`} />
{:else}
  <span
    class={cn('inline-flex shrink-0 select-none items-center justify-center rounded-lg font-black text-white', avatarBg(workspace.id + 3), className)}
    style={`width:${size}px;height:${size}px;font-size:${Math.round(size * 0.45)}px`}
    aria-hidden="true">{workspace.name.slice(0, 1).toUpperCase()}</span
  >
{/if}
