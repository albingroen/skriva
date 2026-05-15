import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'

const lowlight = createLowlight(all)

export default function Editor(): React.JSX.Element {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: false }),
      Markdown,
      TaskList,
      TaskItem.configure({
        nested: true
      }),
      Highlight,
      CodeBlockLowlight.configure({
        lowlight
      })
    ],
    content: '',
    contentType: 'markdown',
    autofocus: 'start',
    editorProps: {
      scrollMargin: { bottom: 160, top: 80, left: 0, right: 0 },
      scrollThreshold: { bottom: 160, top: 80, left: 0, right: 0 },
      attributes: {
        class:
          'px-[10svw] xl:px-[25svw] py-[10svh] prose dark:prose-invert w-svw h-svh text-foreground caret-foreground overflow-y-auto max-w-none outline-none'
      }
    }
  })

  return <EditorContent editor={editor} />
}
