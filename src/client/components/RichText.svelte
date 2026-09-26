<script lang="ts">
  /** Render stored Markdown safely (see shared/markdown.ts — escapes first, whitelists tags). */
  import { renderMarkdown } from '../../shared/markdown'
  import { cn } from '../lib/cn'
  let { body, class: className = '' }: { body: string; class?: string } = $props()
  const html = $derived(renderMarkdown(body ?? ''))
</script>

<div class={cn('rich-text', className)}>{@html html}</div>
