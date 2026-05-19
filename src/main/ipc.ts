import { BrowserWindow, dialog, ipcMain, Menu } from 'electron'
import fs from 'node:fs/promises'

import { Channels } from '@shared/channels'
import type { Note, SaveFilePayload, SaveFileResult } from '@shared/types'

import { SAVE_MENU_ID } from './menu'

let isDirty = false

/**
 * Whether the renderer currently has unsaved changes. Mirrored from
 * `SetDirty` so the main process can decide whether to prompt before
 * closing the window.
 */
export function getIsDirty(): boolean {
  return isDirty
}

/**
 * Wires up every IPC channel the renderer talks to.
 *
 * - `SaveFile` writes the editor buffer to disk, prompting for a
 *   destination when no path is set yet.
 * - `SetDirty` toggles the Save menu item so it reflects whether
 *   the renderer has unsaved changes.
 *
 * Handlers are registered once for the app lifetime. The Save
 * dialog is parented to the window that issued the request, found
 * via `BrowserWindow.fromWebContents`.
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
      return { path: targetPath }
    }
  )

  ipcMain.on(Channels.SetDirty, (_event, nextIsDirty: boolean) => {
    isDirty = nextIsDirty

    const saveItem = Menu.getApplicationMenu()?.getMenuItemById(SAVE_MENU_ID)

    if (saveItem) {
      saveItem.enabled = nextIsDirty
    }
  })
}

/**
 * Shows the system Open dialog, reads the chosen file, and sends
 * its contents to the renderer via `Channels.FileOpened`. Called
 * from the application menu's "Open…" item.
 */
export async function openFileDialog(window: BrowserWindow): Promise<void> {
  const { canceled, filePaths } = await dialog.showOpenDialog(window)

  if (canceled) {
    return
  }

  const filePath = filePaths[0]
  const content = await fs.readFile(filePath, { encoding: 'utf-8' })
  const note: Note = { path: filePath, content }

  window.webContents.send(Channels.FileOpened, note)
}
