/** Small blue dot shown in the title bar when there are unsaved changes. */
export function DirtyIndicator(): React.JSX.Element {
  return (
    <div className="absolute top-2.5 right-3 w-2 h-2 rounded-full bg-blue-500 z-20 pointer-events-none" />
  )
}
