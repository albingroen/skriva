import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from '@tiptap/markdown'

export default function Editor() {
  const editor = useEditor({
    extensions: [StarterKit, Markdown], // define your extension array
    content: '# Hello',
    contentType: 'markdown',
    autofocus: 'end',
    editorProps: {
      scrollMargin: { bottom: 160, top: 80, left: 0, right: 0 },
      scrollThreshold: { bottom: 160, top: 80, left: 0, right: 0 },
      attributes: {
        class:
          'px-[15svw] py-[10svh] prose w-svw h-svh text-foreground selection:bg-paper-dark overflow-y-auto max-w-none outline-none'
      }
    }
  })

  return <EditorContent editor={editor} />
}
