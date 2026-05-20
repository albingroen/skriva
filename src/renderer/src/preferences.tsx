import { useEffect } from 'react'

export default function Preferences(): React.JSX.Element {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        window.close()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <main id="preferences" className="flex flex-col h-screen px-8 py-8">
      <h1 className="text-xl font-medium mb-6">Preferences</h1>
      <p className="text-muted-foreground flex-1">No settings yet.</p>
      <div className="flex justify-end">
        <button style={{ all: 'revert' }} type="button" onClick={() => window.close()}>
          Done
        </button>
      </div>
    </main>
  )
}
