import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'
import { TaskItem, TaskList } from '@tiptap/extension-list'
import Highlight from '@tiptap/extension-highlight'
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight'
import { all, createLowlight } from 'lowlight'
import { Ref, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

const lowlight = createLowlight(all)

export type EditorHandle = {
  load: (content: string) => void
}

type EditorProps = {
  ref?: Ref<EditorHandle>
  onSave: (content: string) => Promise<boolean>
  onDirtyChange: (dirty: boolean) => void
}

export default function Editor({ ref, onSave, onDirtyChange }: EditorProps): React.JSX.Element {
  const savedRef = useRef<string | null>(null)
  const dirtyRef = useRef(false)

  const markClean = useCallback(
    (content: string): void => {
      savedRef.current = content
      dirtyRef.current = false
      onDirtyChange(false)
    },
    [onDirtyChange]
  )

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
        enableTabIndentation: true,
        tabSize: 2,
        lowlight
      })
    ],
    content: '',
    contentType: 'markdown',
    onCreate: ({ editor }) => {
      savedRef.current = editor.getMarkdown()
    },
    onUpdate: ({ editor }) => {
      if (savedRef.current === null) return
      const dirty = editor.getMarkdown() !== savedRef.current
      if (dirty === dirtyRef.current) return
      dirtyRef.current = dirty
      onDirtyChange(dirty)
    },
    editorProps: {
      scrollMargin: { bottom: 160, top: 80, left: 0, right: 0 },
      scrollThreshold: { bottom: 160, top: 80, left: 0, right: 0 },
      attributes: {
        class:
          'px-[10svw] xl:px-[25svw] py-[10svh] prose dark:prose-invert w-svw h-svh text-foreground caret-foreground overflow-y-auto max-w-none outline-none'
      }
    }
  })

  useImperativeHandle(
    ref,
    () => ({
      load: (content) => {
        if (!editor) return
        savedRef.current = null
        editor.chain().setContent(content, { contentType: 'markdown' }).focus('end').run()
        markClean(editor.getMarkdown())
      }
    }),
    [editor, markClean]
  )

  useEffect(() => {
    if (!editor) return
    return window.api.onSaveRequest(async () => {
      const content = editor.getMarkdown()
      const ok = await onSave(content)
      if (!ok) return
      markClean(content)
    })
  }, [editor, onSave, markClean])

  return <EditorContent editor={editor} />
}
