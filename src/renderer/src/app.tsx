import { useCallback, useEffect, useRef, useState } from 'react'

import Editor, { EditorHandle } from './components/editor'
import { DirtyIndicator } from './components/dirty-indicator'
import DragRegion from './components/drag-region'

/**
 * Top-level shell. Owns the open-file path and dirty state, and
 * bridges menu-driven actions (Open / New / Save) into the editor.
 */
function App(): React.JSX.Element {
  const [currentPath, setCurrentPath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const editorRef = useRef<EditorHandle>(null)

  useEffect(() => {
    const unsubscribeFromFileOpened = window.api.onFileOpened((note) => {
      setCurrentPath(note.path)
      editorRef.current?.load(note.content)
    })

    const unsubscribeFromNewFile = window.api.onNewFile(() => {
      setCurrentPath(null)
      editorRef.current?.load('')
    })

    return () => {
      unsubscribeFromFileOpened()
      unsubscribeFromNewFile()
    }
  }, [])

  const handleDirtyChange = useCallback((nextIsDirty: boolean) => {
    setIsDirty(nextIsDirty)
    window.api.setDirty(nextIsDirty)
  }, [])

  const handleSave = useCallback(
    async (content: string): Promise<boolean> => {
      const result = await window.api.saveFile(currentPath, content)

      if (!result) {
        return false
      }

      setCurrentPath(result.path)

      return true
    },
    [currentPath]
  )

  return (
    <>
      <DragRegion />
      {isDirty && <DirtyIndicator />}

      <Editor ref={editorRef} onSave={handleSave} onDirtyChange={handleDirtyChange} />
    </>
  )
}

export default App
