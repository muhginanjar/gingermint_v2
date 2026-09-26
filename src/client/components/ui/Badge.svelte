<script lang="ts">
  import type { Snippet } from 'svelte'
  import { badgeVariants, type BadgeVariant } from '../../lib/variants'

  let { variant = 'default', class: className = '', children }: { variant?: BadgeVariant; class?: string; children: Snippet } =
    $props()
</script>

<span class={badgeVariants({ variant, class: className })}>{@render children()}</span>
