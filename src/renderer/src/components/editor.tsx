import { useEditor, EditorContent } from '@tiptap/react'
import type { Node as ProseMirrorNode } from '@tiptap/pm/model'
import { Ref, useCallback, useEffect, useImperativeHandle, useRef } from 'react'

import { editorExtensions } from './editor-extensions'

/**
 * Imperative handle the parent uses to load fresh content into
 * the editor (e.g. when opening a file or creating a new note).
 */
export type EditorHandle = {
  load: (content: string) => void
}

type EditorProps = {
  ref?: Ref<EditorHandle>

  /** Persists `content` to disk. Returns true on success. */
  onSave: (content: string) => Promise<boolean>

  /** Fires when the dirty (unsaved-changes) state flips. */
  onDirtyChange: (isDirty: boolean) => void
}

/**
 * Markdown editor wrapping TipTap.
 *
 * Dirty tracking compares the live ProseMirror document against a
 * saved reference using `doc.eq`, which is far cheaper than
 * serializing the document to markdown on every keystroke. The
 * markdown serialization runs only on save and on the initial load.
 */
export default function Editor({ ref, onSave, onDirtyChange }: EditorProps): React.JSX.Element {
  const savedDocRef = useRef<ProseMirrorNode | null>(null)
  const isDirtyRef = useRef(false)

  const markClean = useCallback(
    (cleanDoc: ProseMirrorNode): void => {
      savedDocRef.current = cleanDoc
      isDirtyRef.current = false
      onDirtyChange(false)
    },
    [onDirtyChange]
  )

  const editor = useEditor({
    extensions: editorExtensions,
    content: '',
    contentType: 'markdown',
    autofocus: 'end',
    onCreate: ({ editor }) => {
      savedDocRef.current = editor.state.doc
    },
    onUpdate: ({ editor }) => {
      if (savedDocRef.current === null) {
        return
      }

      const isDirty = !editor.state.doc.eq(savedDocRef.current)

      if (isDirty === isDirtyRef.current) {
        return
      }

      isDirtyRef.current = isDirty
      onDirtyChange(isDirty)
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
        if (!editor) {
          return
        }

        savedDocRef.current = null
        editor.chain().setContent(content, { contentType: 'markdown' }).focus('end').run()
        markClean(editor.state.doc)
      }
    }),
    [editor, markClean]
  )

  useEffect(() => {
    if (!editor) {
      return
    }

    console.log('listen')

    return window.api.onSaveRequest(async () => {
      const cleanDoc = editor.state.doc
      const content = editor.getMarkdown()
      const wasSaved = await onSave(content)

      if (!wasSaved) {
        return
      }

      markClean(cleanDoc)
    })
  }, [editor, onSave, markClean])

  return <EditorContent editor={editor} />
}
