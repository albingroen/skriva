import { BrowserWindow, dialog, ipcMain, Menu, MenuItemConstructorOptions } from 'electron'
import fs from 'node:fs/promises'

import { Channels } from '@shared/channels'
import { FORMAT_COMMAND_NAMES, type FormatState, formatMenuItemId } from '@shared/format'
import type { Note, SaveFilePayload, SaveFileResult } from '@shared/types'

import { buildFormatMenu, SAVE_MENU_ID } from './menu'
import {
  getEntryById,
  getEntryByWindow,
  getFocusedEditor,
  setDirty,
  setFormatState,
  setPath
} from './window-registry'

async function readNoteFromDisk(filePath: string): Promise<Note> {
  const content = await fs.readFile(filePath, { encoding: 'utf-8' })
  return { path: filePath, content }
}

/**
 * Reads `filePath`, records it on the target window's registry
 * entry, and delivers it to the renderer via `Channels.FileOpened`.
 * On failure, shows an error dialog parented to the target. Shared
 * between the Open… menu, the macOS `open-file` event, and the
 * initial-path branch of `createMainWindow`.
 */
export async function loadFileIntoWindow(window: BrowserWindow, filePath: string): Promise<void> {
  try {
    const note = await readNoteFromDisk(filePath)

    if (window.isDestroyed()) {
      return
    }

    setPath(window.webContents.id, filePath)
    window.webContents.send(Channels.FileOpened, note)
  } catch (error) {
    if (window.isDestroyed()) {
      return
    }

    const detail = error instanceof Error ? error.message : String(error)
    await dialog.showMessageBox(window, {
      type: 'error',
      message: 'Could not open file',
      detail
    })
  }
}

/**
 * Whether the given window currently has unsaved changes. Mirrored
 * from `SetDirty` into the window registry; main reads it when the
 * window is asked to close.
 */
export function getIsDirty(window: BrowserWindow): boolean {
  return getEntryByWindow(window)?.isDirty ?? false
}

/**
 * Pushes per-window state (Save enabled, Format checkmarks) into the
 * global application menu so it reflects the currently focused
 * editor. Called from `browser-window-focus`/`-blur` listeners and
 * whenever the focused window itself reports new state. Passing
 * `null` (no editor focused) disables Save and clears checkmarks.
 */
export function syncMenuToFocusedWindow(window: BrowserWindow | null): void {
  const menu = Menu.getApplicationMenu()

  if (!menu) {
    return
  }

  const entry = window ? getEntryById(window.webContents.id) : undefined

  const saveItem = menu.getMenuItemById(SAVE_MENU_ID)

  if (saveItem) {
    saveItem.enabled = entry?.isDirty ?? false
  }

  const state = entry?.formatState

  for (const name of FORMAT_COMMAND_NAMES) {
    const item = menu.getMenuItemById(formatMenuItemId(name))

    if (item) {
      item.checked = state?.[name] ?? false
    }
  }
}

/**
 * Wires up every IPC channel the renderer talks to.
 *
 * - `SaveFile` writes the editor buffer to disk, prompting for a
 *   destination when no path is set yet, and records the resolved
 *   path on the sender window's registry entry.
 * - `SetDirty` updates the sender window's dirty flag; the global
 *   Save menu item is toggled only when the sender is also the
 *   focused window (focus/blur listeners sync on switch).
 * - `FormatStateChanged` mirrors the sender's selection state into
 *   the registry and the menu (when sender is focused).
 *
 * Handlers are registered once for the app lifetime. Per-window
 * routing is done via `event.sender.id` lookups in the registry.
 */
export function registerIpcHandlers(): void {
  ipcMain.handle(
    Channels.SaveFile,
    async (event, payload: SaveFilePayload): Promise<SaveFileResult> => {
      let targetPath = payload.path

      if (!targetPath) {
        const senderWindow = BrowserWindow.fromWebContents(event.sender)
        const dialogOptions = {
          filters: [{ name: 'Markdown', extensions: ['md'] }]
        }
        const { canceled, filePath } = senderWindow
          ? await dialog.showSaveDialog(senderWindow, dialogOptions)
          : await dialog.showSaveDialog(dialogOptions)

        if (canceled || !filePath) {
          return null
        }

        targetPath = filePath
      }

      await fs.writeFile(targetPath, payload.content, { encoding: 'utf-8' })
      setPath(event.sender.id, targetPath)
      return { path: targetPath }
    }
  )

  ipcMain.on(Channels.SetDirty, (event, nextIsDirty: boolean) => {
    setDirty(event.sender.id, nextIsDirty)

    const focused = getFocusedEditor()

    if (!focused || focused.window.webContents.id !== event.sender.id) {
      return
    }

    const saveItem = Menu.getApplicationMenu()?.getMenuItemById(SAVE_MENU_ID)

    if (saveItem) {
      saveItem.enabled = nextIsDirty
    }
  })

  ipcMain.on(Channels.FormatStateChanged, (event, state: FormatState) => {
    setFormatState(event.sender.id, state)

    const focused = getFocusedEditor()

    if (!focused || focused.window.webContents.id !== event.sender.id) {
      return
    }

    const menu = Menu.getApplicationMenu()

    if (!menu) {
      return
    }

    for (const name of FORMAT_COMMAND_NAMES) {
      const item = menu.getMenuItemById(formatMenuItemId(name))

      if (item && item.checked !== state[name]) {
        item.checked = state[name]
      }
    }
  })

  ipcMain.on(Channels.ShowContextMenu, (event, state: FormatState) => {
    const senderWindow = BrowserWindow.fromWebContents(event.sender)

    if (!senderWindow) {
      return
    }

    const template: MenuItemConstructorOptions[] = [
      { role: 'cut' },
      { role: 'copy' },
      { role: 'paste' },
      { type: 'separator' },
      ...buildFormatMenu(() => senderWindow, state)
    ]

    Menu.buildFromTemplate(template).popup({ window: senderWindow })
  })
}
