import { BrowserWindow } from 'electron'
import { basename } from 'path'

import type { FormatState } from '@shared/format'

const UNTITLED_TITLE = 'Untitled'

/**
 * Per-editor-window state tracked by main. The preferences window is
 * intentionally excluded — only editor windows participate in the
 * dirty/path/format lookups that drive menu state and ⌘+O dedup.
 */
export type EditorEntry = {
  window: BrowserWindow
  path: string | null
  isDirty: boolean
  formatState: FormatState | null
}

const editorWindows = new Map<number, EditorEntry>()

/**
 * Pushes the entry's path + dirty state into the OS-level window
 * chrome: title, the macOS title-bar file proxy, and the macOS
 * close-button "modified" dot. Called whenever path or dirty changes.
 */
function syncWindowChrome(entry: EditorEntry): void {
  if (entry.window.isDestroyed()) {
    return
  }

  entry.window.setTitle(entry.path ? basename(entry.path) : UNTITLED_TITLE)
  entry.window.setRepresentedFilename(entry.path ?? '')
  entry.window.setDocumentEdited(entry.isDirty)
}

export function registerEditorWindow(
  window: BrowserWindow,
  initialPath: string | null = null
): EditorEntry {
  const id = window.webContents.id
  const entry: EditorEntry = {
    window,
    path: initialPath,
    isDirty: false,
    formatState: null
  }
  editorWindows.set(id, entry)
  syncWindowChrome(entry)
  window.on('closed', () => {
    editorWindows.delete(id)
  })
  return entry
}

export function getEntryById(id: number): EditorEntry | undefined {
  return editorWindows.get(id)
}

export function getEntryByWindow(window: BrowserWindow): EditorEntry | undefined {
  return editorWindows.get(window.webContents.id)
}

export function getEntryByPath(path: string): EditorEntry | undefined {
  for (const entry of editorWindows.values()) {
    if (entry.path === path) {
      return entry
    }
  }
  return undefined
}

export function getFocusedEditor(): EditorEntry | undefined {
  const focused = BrowserWindow.getFocusedWindow()
  if (!focused) {
    return undefined
  }
  return editorWindows.get(focused.webContents.id)
}

export function setPath(id: number, path: string | null): void {
  const entry = editorWindows.get(id)
  if (entry && entry.path !== path) {
    entry.path = path
    syncWindowChrome(entry)
  }
}

export function setDirty(id: number, isDirty: boolean): void {
  const entry = editorWindows.get(id)
  if (entry && entry.isDirty !== isDirty) {
    entry.isDirty = isDirty
    syncWindowChrome(entry)
  }
}

export function setFormatState(id: number, state: FormatState): void {
  const entry = editorWindows.get(id)
  if (entry) {
    entry.formatState = state
  }
}

export function isBlankAndClean(entry: EditorEntry): boolean {
  return entry.path === null && !entry.isDirty
}
