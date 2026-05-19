import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'

const lowlight = createLowlight(all)

/**
 * TipTap extension list used by the editor. Defined at module
 * scope so it (and the lowlight registry) is built exactly once
 * per process — adding or removing an extension only requires
 * editing this file.
 */
export const editorExtensions = [
  StarterKit.configure({ codeBlock: false }),
  Markdown,
  TaskList,
  TaskItem.configure({ nested: true }),
  Highlight,
  CodeBlockLowlight.configure({
    enableTabIndentation: true,
    tabSize: 2,
    lowlight
  })
]
