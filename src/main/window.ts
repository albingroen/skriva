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
 * Creates the main application window, installs theme + lifecycle
 * listeners, loads the renderer, and attaches the application menu.
 */
export function createMainWindow(): BrowserWindow {
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
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

  const handleThemeUpdate = (): void => {
    mainWindow.setBackgroundColor(getBackgroundColor())
  }

  nativeTheme.on('updated', handleThemeUpdate)

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

  mainWindow.on('closed', () => {
    nativeTheme.off('updated', handleThemeUpdate)
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

  Menu.setApplicationMenu(buildAppMenu(mainWindow))

  return mainWindow
}

function requestSaveFromRenderer(window: BrowserWindow): Promise<boolean> {
  return new Promise((resolve) => {
    ipcMain.once(Channels.SaveCompleted, (_event, success: boolean) => {
      resolve(success)
    })

    window.webContents.send(Channels.SaveRequest)
  })
}
