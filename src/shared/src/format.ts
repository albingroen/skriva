export type FormatCommandName =
  | 'heading1'
  | 'heading2'
  | 'heading3'
  | 'heading4'
  | 'heading5'
  | 'heading6'
  | 'paragraph'
  | 'codeBlock'
  | 'code'
  | 'blockquote'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'highlight'
  | 'bulletList'
  | 'orderedList'
  | 'taskList'

export type FormatState = Record<FormatCommandName, boolean>

export const FORMAT_COMMAND_NAMES: readonly FormatCommandName[] = [
  'heading1',
  'heading2',
  'heading3',
  'heading4',
  'heading5',
  'heading6',
  'paragraph',
  'codeBlock',
  'code',
  'blockquote',
  'bold',
  'italic',
  'underline',
  'strike',
  'highlight',
  'bulletList',
  'orderedList',
  'taskList'
] as const

export type FormatMenuEntry =
  | { kind: 'item'; name: FormatCommandName; label: string; accelerator?: string }
  | { kind: 'submenu'; label: string; entries: FormatMenuEntry[] }
  | { kind: 'separator' }

/**
 * Declarative description of the Format menu. Consumed by main to
 * build both the application menu bar entry and the right-click
 * context-menu popup. The renderer never reads this — it only cares
 * about `FormatCommandName` values that arrive via IPC.
 */
export const FORMAT_MENU: FormatMenuEntry[] = [
  {
    kind: 'submenu',
    label: 'Text',
    entries: [
      { kind: 'item', name: 'heading1', label: 'Heading 1', accelerator: 'CmdOrCtrl+Alt+1' },
      { kind: 'item', name: 'heading2', label: 'Heading 2', accelerator: 'CmdOrCtrl+Alt+2' },
      { kind: 'item', name: 'heading3', label: 'Heading 3', accelerator: 'CmdOrCtrl+Alt+3' },
      { kind: 'item', name: 'heading4', label: 'Heading 4', accelerator: 'CmdOrCtrl+Alt+4' },
      { kind: 'item', name: 'heading5', label: 'Heading 5', accelerator: 'CmdOrCtrl+Alt+5' },
      { kind: 'item', name: 'heading6', label: 'Heading 6', accelerator: 'CmdOrCtrl+Alt+6' },
      { kind: 'separator' },
      { kind: 'item', name: 'paragraph', label: 'Paragraph', accelerator: 'CmdOrCtrl+Alt+0' },
      { kind: 'item', name: 'codeBlock', label: 'Code Block', accelerator: 'CmdOrCtrl+Alt+C' },
      { kind: 'item', name: 'code', label: 'Inline Code', accelerator: 'CmdOrCtrl+E' },
      { kind: 'item', name: 'blockquote', label: 'Blockquote', accelerator: 'CmdOrCtrl+Shift+B' }
    ]
  },
  { kind: 'separator' },
  { kind: 'item', name: 'bold', label: 'Bold', accelerator: 'CmdOrCtrl+B' },
  { kind: 'item', name: 'italic', label: 'Italic', accelerator: 'CmdOrCtrl+I' },
  { kind: 'item', name: 'underline', label: 'Underline', accelerator: 'CmdOrCtrl+U' },
  { kind: 'item', name: 'strike', label: 'Strike Through', accelerator: 'CmdOrCtrl+Shift+X' },
  { kind: 'item', name: 'highlight', label: 'Highlight', accelerator: 'CmdOrCtrl+Shift+H' },
  { kind: 'separator' },
  {
    kind: 'submenu',
    label: 'List',
    entries: [
      { kind: 'item', name: 'bulletList', label: 'Bullet List', accelerator: 'CmdOrCtrl+Shift+8' },
      {
        kind: 'item',
        name: 'orderedList',
        label: 'Ordered List',
        accelerator: 'CmdOrCtrl+Shift+7'
      },
      { kind: 'item', name: 'taskList', label: 'Task List', accelerator: 'CmdOrCtrl+Shift+9' }
    ]
  }
]

export const formatMenuItemId = (name: FormatCommandName): string => `format.${name}`
