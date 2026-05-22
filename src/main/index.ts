import { app, BrowserWindow, dialog, Menu } from 'electron'
import { electronApp, optimizer } from '@electron-toolkit/utils'

import { createMainWindow, openPreferencesWindow } from './window'
import { loadFileIntoWindow, registerIpcHandlers, syncMenuToFocusedWindow } from './ipc'
import { buildAppMenu } from './menu'
import { initAutoUpdater } from './updater'
import { getEntryByPath, getFocusedEditor, isBlankAndClean } from './window-registry'

/**
 * Opens `filePath` using the same precedence as ⌘+O:
 *   1. If the file is already open in some window, focus that window.
 *   2. Else if the focused editor is blank & clean, load it there.
 *   3. Else spawn a new window with the file.
 * Shared between the Open… menu and the macOS `open-file` event (used
 * for "Open with Skriva" from Finder).
 */
async function openFileInWindow(filePath: string): Promise<void> {
  const existing = getEntryByPath(filePath)

  if (existing) {
    existing.window.focus()
    return
  }

  const focused = getFocusedEditor()

  if (focused && isBlankAndClean(focused)) {
    await loadFileIntoWindow(focused.window, filePath)
    return
  }

  createMainWindow({ initialPath: filePath })
}

/**
 * ⌘+N handler. Always spawns a new blank editor window — matches
 * macOS-native behavior where ⌘+N creates a window even if the
 * current one is already blank (otherwise nothing visible would
 * happen when the user invokes the shortcut).
 */
function handleNewFromMenu(): void {
  createMainWindow()
}

/**
 * ⌘+O handler. Shows the system Open dialog parented to the focused
 * editor (when one exists), then routes the chosen file through
 * `openFileInWindow`.
 */
async function handleOpenFromMenu(): Promise<void> {
  const focused = getFocusedEditor()

  const { canceled, filePaths } = focused
    ? await dialog.showOpenDialog(focused.window)
    : await dialog.showOpenDialog({})

  if (canceled || filePaths.length === 0) {
    return
  }

  await openFileInWindow(filePaths[0])
}

// `open-file` (macOS) fires when the user invokes "Open with Skriva"
// from Finder, drags a file onto the dock icon, or double-clicks an
// associated file. It can arrive before `app.whenReady()` resolves —
// in that case we queue the path and drain after launch instead of
// also opening a blank window.
const pendingOpenPaths: string[] = []
let appReady = false

app.on('open-file', (event, filePath) => {
  event.preventDefault()

  if (appReady) {
    void openFileInWindow(filePath)
  } else {
    pendingOpenPaths.push(filePath)
  }
})

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.electron')

  app.on('browser-window-created', (_event, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerIpcHandlers()

  Menu.setApplicationMenu(
    buildAppMenu({
      onNew: handleNewFromMenu,
      onOpen: handleOpenFromMenu,
      onOpenPreferences: () => openPreferencesWindow(BrowserWindow.getFocusedWindow() ?? undefined)
    })
  )

  if (pendingOpenPaths.length > 0) {
    for (const filePath of pendingOpenPaths) {
      createMainWindow({ initialPath: filePath })
    }
    pendingOpenPaths.length = 0
  } else {
    createMainWindow()
  }

  appReady = true

  app.on('browser-window-focus', (_event, window) => {
    syncMenuToFocusedWindow(window)
  })

  app.on('browser-window-blur', () => {
    syncMenuToFocusedWindow(BrowserWindow.getFocusedWindow())
  })

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow()
    }
  })

  initAutoUpdater()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
