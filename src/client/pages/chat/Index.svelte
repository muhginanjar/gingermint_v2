<script lang="ts">
  import type { ChatLine, Person, ProjectRef } from '../../../shared/models'
  import ChatRoom from '../../components/ChatRoom.svelte'
  import ProjectShell from '../../components/ProjectShell.svelte'
  import Icon from '../../components/ui/Icon.svelte'
  import AvatarStack from '../../components/ui/AvatarStack.svelte'
  import * as icons from '../../lib/icons'

  let { project, lines, people }: { project: ProjectRef; lines: ChatLine[]; people: Person[] } = $props()
</script>

<ProjectShell {project} tool="chat">
  <div class="mb-3 flex items-center gap-3">
    <h1 class="text-2xl font-black tracking-tight">Chat</h1>
    <span class="flex items-center gap-1 rounded-full bg-sky-100 px-2 py-0.5 text-xs font-medium text-sky-900 dark:bg-sky-900/40 dark:text-sky-200"><Icon icon={icons.Lock} size={11} /> Private to the team</span>
    <span class="ml-auto"><AvatarStack {people} size={22} max={8} /></span>
  </div>
  <ChatRoom initial={lines} base={`/projects/${project.id}/chat/lines`} projectId={project.id} {people} canLoadOlder watchReactions placeholder={`Message ${project.name}…`} />
</ProjectShell>
