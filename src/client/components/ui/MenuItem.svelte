<script lang="ts">
  /** A DropdownMenu item: button, Inertia link (href) or external link. */
  import { Link } from '@inertiajs/svelte'
  import type { IconNode } from 'lucide'
  import type { Snippet } from 'svelte'
  import { cn } from '../../lib/cn'
  import { menuItemClass } from '../../lib/variants'
  import Icon from './Icon.svelte'

  let {
    href,
    external = false,
    icon,
    danger = false,
    onclick,
    class: className = '',
    children,
    ...rest
  }: {
    href?: string
    external?: boolean
    icon?: IconNode
    danger?: boolean
    onclick?: (e: MouseEvent) => void
    class?: string
    children: Snippet
    [key: string]: unknown
  } = $props()

  const cls = $derived(cn(menuItemClass, danger && 'text-destructive hover:text-destructive', className))
</script>

{#if href && external}
  <a {href} class={cls} role="menuitem" target="_blank" rel="noopener noreferrer" {...rest}
    >{#if icon}<Icon {icon} />{/if}{@render children()}</a
  >
{:else if href}
  <Link {href} class={cls} role="menuitem" {...rest}>{#if icon}<Icon {icon} />{/if}{@render children()}</Link>
{:else}
  <button type="button" class={cls} role="menuitem" {onclick} {...rest}
    >{#if icon}<Icon {icon} />{/if}{@render children()}</button
  >
{/if}
