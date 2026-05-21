import { app, BrowserWindow, dialog, IpcMainEvent, ipcMain, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

import { Channels } from '@shared/channels'

import icon from '../../resources/icon.png?asset'
import { getIsDirty, loadFileIntoWindow } from './ipc'
import { registerEditorWindow } from './window-registry'

const BG_LIGHT = '#F5F5F5'
const BG_DARK = '#1D1D16'

// Electron aborts the in-flight `app.quit()` cycle as soon as a
// `close` handler calls `preventDefault`, so the close handler has
// to re-issue `app.quit()` itself after the user picks Save/Discard.
let isQuitting = false

app.on('before-quit', () => {
  isQuitting = true
})

const SAVE_BUTTON = 0
const CANCEL_BUTTON = 2

/**
 * Resolves the window background color for the current OS theme.
 * Used both at window creation and when the system theme changes,
 * so the title bar tint matches the renderer's CSS background.
 */
function getBackgroundColor(): string {
  if (nativeTheme.shouldUseDarkColors) {
    return BG_DARK
  }

  return BG_LIGHT
}

/**
 * Keeps `window`'s background in sync with the OS theme and tears
 * the listener down when the window closes.
 */
function syncBackgroundToTheme(window: BrowserWindow): void {
  const handleThemeUpdate = (): void => {
    if (!window.isDestroyed()) {
      window.setBackgroundColor(getBackgroundColor())
    }
  }

  nativeTheme.on('updated', handleThemeUpdate)
  window.on('closed', () => nativeTheme.off('updated', handleThemeUpdate))
}

export type CreateMainWindowOptions = {
  /** Optional file to load into the new window after the renderer is ready. */
  initialPath?: string
}

/**
 * Creates an editor window, installs theme + lifecycle listeners,
 * loads the renderer, and registers it in the window registry. When
 * `initialPath` is provided, reads that file and delivers it to the
 * renderer via `Channels.FileOpened` once the page has finished
 * loading.
 */
export function createMainWindow(options: CreateMainWindowOptions = {}): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    minWidth: 450,
    minHeight: 670,
    show: false,
    backgroundColor: getBackgroundColor(),
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hiddenInset'
  })

  registerEditorWindow(mainWindow, options.initialPath ?? null)
  syncBackgroundToTheme(mainWindow)

  let forceClose = false

  mainWindow.on('close', async (event) => {
    if (forceClose || !getIsDirty(mainWindow)) {
      return
    }

    event.preventDefault()

    const { response } = await dialog.showMessageBox(mainWindow, {
      type: 'warning',
      message: 'Save changes before closing?',
      detail: "Your changes will be lost if you don't save them.",
      buttons: ['Save', 'Discard', 'Cancel'],
      defaultId: SAVE_BUTTON,
      cancelId: CANCEL_BUTTON
    })

    if (response === CANCEL_BUTTON) {
      isQuitting = false
      return
    }

    if (response === SAVE_BUTTON) {
      const saved = await requestSaveFromRenderer(mainWindow)

      if (!saved) {
        isQuitting = false
        return
      }
    }

    forceClose = true
    mainWindow.destroy()

    if (isQuitting) {
      app.quit()
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // The renderer HTML carries a static `<title>Skriva</title>` which
  // Electron would otherwise sync onto the window each load, clobbering
  // the per-file title (basename / "Untitled") we set in the registry.
  mainWindow.webContents.on('page-title-updated', (event) => {
    event.preventDefault()
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  if (options.initialPath) {
    const initialPath = options.initialPath

    mainWindow.webContents.once('did-finish-load', () => {
      void loadFileIntoWindow(mainWindow, initialPath)
    })
  }

  return mainWindow
}

let preferencesWindow: BrowserWindow | null = null

/**
 * Opens the Preferences window, or focuses it if already open. Loads
 * the secondary `preferences.html` renderer entry configured in
 * `electron.vite.config.ts`. Non-modal — multiple editor windows can
 * remain interactive underneath it. `parent` is honored for initial
 * positioning on macOS but the preferences window outlives any
 * single editor.
 */
export function openPreferencesWindow(parent?: BrowserWindow): void {
  if (preferencesWindow) {
    preferencesWindow.focus()
    return
  }

  preferencesWindow = new BrowserWindow({
    width: 520,
    height: 380,
    parent,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: getBackgroundColor(),
    titleBarStyle: 'hiddenInset',
    title: 'Preferences',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  syncBackgroundToTheme(preferencesWindow)

  preferencesWindow.on('ready-to-show', () => {
    preferencesWindow?.show()
  })

  preferencesWindow.on('closed', () => {
    preferencesWindow = null
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    preferencesWindow.loadURL(`${process.env['ELECTRON_RENDERER_URL']}/preferences.html`)
  } else {
    preferencesWindow.loadFile(join(__dirname, '../renderer/preferences.html'))
  }
}

function requestSaveFromRenderer(window: BrowserWindow): Promise<boolean> {
  return new Promise((resolve) => {
    const handler = (event: IpcMainEvent, success: boolean): void => {
      if (event.sender.id !== window.webContents.id) {
        return
      }

      ipcMain.removeListener(Channels.SaveCompleted, handler)
      resolve(success)
    }

    ipcMain.on(Channels.SaveCompleted, handler)
    window.webContents.send(Channels.SaveRequest)
  })
}
