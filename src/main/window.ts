import { app, BrowserWindow, dialog, ipcMain, Menu, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

import { Channels } from '@shared/channels'

import icon from '../../resources/icon.png?asset'
import { getIsDirty } from './ipc'
import { buildAppMenu } from './menu'

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

/**
 * Creates the main application window, installs theme + lifecycle
 * listeners, loads the renderer, and attaches the application menu.
 */
export function createMainWindow(): BrowserWindow {
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

  syncBackgroundToTheme(mainWindow)

  let forceClose = false

  mainWindow.on('close', async (event) => {
    if (forceClose || !getIsDirty()) {
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

  // Electron destroys modal children when their parent goes away
  // but does not always emit `closed` on them, leaving our cached
  // reference pointing at a destroyed window. Closing it here forces
  // the cleanup path to run.
  mainWindow.on('closed', () => {
    preferencesWindow?.close()
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  Menu.setApplicationMenu(buildAppMenu(mainWindow, () => openPreferencesWindow(mainWindow)))

  return mainWindow
}

let preferencesWindow: BrowserWindow | null = null

/**
 * Opens the Preferences window, or focuses it if already open. Loads
 * the secondary `preferences.html` renderer entry configured in
 * `electron.vite.config.ts`. Opened as an app-modal child of `parent`
 * so the editor window can't be interacted with while it's up.
 */
export function openPreferencesWindow(parent: BrowserWindow): void {
  if (preferencesWindow) {
    preferencesWindow.focus()
    return
  }

  preferencesWindow = new BrowserWindow({
    width: 520,
    height: 380,
    parent,
    modal: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    show: false,
    backgroundColor: getBackgroundColor(),
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
    ipcMain.once(Channels.SaveCompleted, (_event, success: boolean) => {
      resolve(success)
    })

    window.webContents.send(Channels.SaveRequest)
  })
}
