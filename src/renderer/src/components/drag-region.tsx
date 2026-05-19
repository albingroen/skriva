/** Invisible strip at the top that lets the user drag the window. */
export default function DragRegion(): React.JSX.Element {
  return <div className="h-7 absolute top-0 inset-x-0 drag z-10" />
}
