import { BrowserWindow, Menu, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { is } from '@electron-toolkit/utils'

import icon from '../../resources/icon.png?asset'
import { buildAppMenu } from './menu'

const BG_LIGHT = '#FAFAF9'
const BG_DARK = '#1D1D16'

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
