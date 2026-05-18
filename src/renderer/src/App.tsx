import { useCallback, useEffect, useRef, useState } from 'react'
import Editor, { EditorHandle } from './components/Editor'

function App(): React.JSX.Element {
  const [path, setPath] = useState<string | null>(null)
  const [isDirty, setIsDirty] = useState(false)
  const editorRef = useRef<EditorHandle>(null)

  useEffect(() => {
    const unsubOpened = window.api.onFileOpened((note) => {
      setPath(note.path)
      editorRef.current?.load(note.content)
    })
    const unsubNew = window.api.onNewFile(() => {
      setPath(null)
      editorRef.current?.load('')
    })
    return () => {
      unsubOpened()
      unsubNew()
    }
  }, [])

  const handleDirtyChange = useCallback((dirty: boolean) => {
    setIsDirty(dirty)
    window.api.setDirty(dirty)
  }, [])

  const handleSave = useCallback(
    async (content: string): Promise<boolean> => {
      const result = await window.api.saveFile(path, content)
      if (!result) return false
      setPath(result.path)
      return true
    },
    [path]
  )

  return (
    <>
      <div className="h-7 absolute top-0 inset-x-0 drag z-10" />

      {isDirty && (
        <div className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-blue-500 z-20 pointer-events-none" />
      )}

      <Editor ref={editorRef} onSave={handleSave} onDirtyChange={handleDirtyChange} />
    </>
  )
}

export default App
