<script lang="ts">
  /** A project's visual identity: uploaded logo, or emoji icon on its color, or its initial. */
  import { cn } from '../lib/cn'
  import { colorOf } from '../lib/colors'

  let {
    project,
    size = 28,
    class: className = '',
  }: { project: { name: string; icon: string; color: string; logoUrl: string | null }; size?: number; class?: string } = $props()
</script>

{#if project.logoUrl}
  <img src={project.logoUrl} alt="" width={size} height={size} class={cn('shrink-0 rounded-md object-cover', className)} style={`width:${size}px;height:${size}px`} />
{:else}
  <span
    class={cn('inline-flex shrink-0 select-none items-center justify-center rounded-md font-bold', project.icon ? colorOf(project.color).soft : cn(colorOf(project.color).strong, 'text-white'), className)}
    style={`width:${size}px;height:${size}px;font-size:${Math.round(size * (project.icon ? 0.6 : 0.45))}px`}
    aria-hidden="true">{project.icon || project.name.slice(0, 1).toUpperCase()}</span
  >
{/if}
