import type { Editor } from '@tiptap/react'

import type { FormatCommandName, FormatState } from '@shared/format'

export function computeFormatState(editor: Editor): FormatState {
  return {
    heading1: editor.isActive('heading', { level: 1 }),
    heading2: editor.isActive('heading', { level: 2 }),
    heading3: editor.isActive('heading', { level: 3 }),
    heading4: editor.isActive('heading', { level: 4 }),
    heading5: editor.isActive('heading', { level: 5 }),
    heading6: editor.isActive('heading', { level: 6 }),
    paragraph: editor.isActive('paragraph'),
    codeBlock: editor.isActive('codeBlock'),
    code: editor.isActive('code'),
    blockquote: editor.isActive('blockquote'),
    bold: editor.isActive('bold'),
    italic: editor.isActive('italic'),
    underline: editor.isActive('underline'),
    strike: editor.isActive('strike'),
    highlight: editor.isActive('highlight'),
    bulletList: editor.isActive('bulletList'),
    orderedList: editor.isActive('orderedList'),
    taskList: editor.isActive('taskList')
  }
}

export function dispatchFormatCommand(editor: Editor, name: FormatCommandName): void {
  const chain = editor.chain().focus()

  switch (name) {
    case 'heading1':
      chain.toggleHeading({ level: 1 }).run()
      return
    case 'heading2':
      chain.toggleHeading({ level: 2 }).run()
      return
    case 'heading3':
      chain.toggleHeading({ level: 3 }).run()
      return
    case 'heading4':
      chain.toggleHeading({ level: 4 }).run()
      return
    case 'heading5':
      chain.toggleHeading({ level: 5 }).run()
      return
    case 'heading6':
      chain.toggleHeading({ level: 6 }).run()
      return
    case 'paragraph':
      chain.setParagraph().run()
      return
    case 'codeBlock':
      chain.toggleCodeBlock().run()
      return
    case 'code':
      chain.toggleCode().run()
      return
    case 'blockquote':
      chain.toggleBlockquote().run()
      return
    case 'bold':
      chain.toggleBold().run()
      return
    case 'italic':
      chain.toggleItalic().run()
      return
    case 'underline':
      chain.toggleUnderline().run()
      return
    case 'strike':
      chain.toggleStrike().run()
      return
    case 'highlight':
      chain.toggleHighlight().run()
      return
    case 'bulletList':
      chain.toggleBulletList().run()
      return
    case 'orderedList':
      chain.toggleOrderedList().run()
      return
    case 'taskList':
      chain.toggleTaskList().run()
      return
  }
}
