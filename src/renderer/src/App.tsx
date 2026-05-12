import Editor from './components/Editor'

function App(): React.JSX.Element {
  return (
    <>
      <div className="h-7 absolute top-0 inset-x-0 drag z-10" />

      <Editor />
    </>
  )
}

export default App
