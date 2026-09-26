<script lang="ts">
  /** shadcn Button. With `href` it renders an Inertia <Link> (or <a> when `external`). */
  import { Link } from '@inertiajs/svelte'
  import type { Snippet } from 'svelte'
  import { buttonVariants, type ButtonSize, type ButtonVariant } from '../../lib/variants'

  let {
    variant = 'default',
    size = 'default',
    href,
    external = false,
    type = 'button',
    class: className = '',
    children,
    ...rest
  }: {
    variant?: ButtonVariant
    size?: ButtonSize
    href?: string
    external?: boolean
    type?: 'button' | 'submit' | 'reset'
    class?: string
    children?: Snippet
    [key: string]: unknown
  } = $props()

  const cls = $derived(buttonVariants({ variant, size, class: className }))
</script>

{#if href && external}
  <a {href} class={cls} {...rest}>{@render children?.()}</a>
{:else if href}
  <Link {href} class={cls} {...rest}>{@render children?.()}</Link>
{:else}
  <button {type} class={cls} {...rest}>{@render children?.()}</button>
{/if}
