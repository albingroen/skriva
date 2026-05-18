import { useCallback, useEffect, useState } from 'react'
import Editor from './components/Editor'
import { Note } from '@shared/types'

function App(): React.JSX.Element {
  const [note, setNote] = useState<Note>()
  const [isDirty, setIsDirty] = useState(false)

  useEffect(() => {
    const unsubOpened = window.api.onFileOpened((value) => {
      setNote(value)
      setIsDirty(false)
    })
    const unsubNew = window.api.onNewFile(() => {
      setNote(undefined)
      setIsDirty(false)
    })
    return () => {
      unsubOpened()
      unsubNew()
    }
  }, [])

  const handleSave = useCallback(
    async (content: string): Promise<boolean> => {
      const result = await window.api.saveFile(note?.path ?? null, content)
      if (!result) return false
      setNote({ path: result.path, content })
      return true
    },
    [note?.path]
  )

  return (
    <>
      <div className="h-7 absolute top-0 inset-x-0 drag z-10" />

      {isDirty && (
        <div className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-blue-500 z-20 pointer-events-none" />
      )}

      <Editor onSave={handleSave} onDirtyChange={setIsDirty} key={note?.path} note={note} />
    </>
  )
}

export default App
