import { app, shell, BrowserWindow, nativeTheme, Menu, dialog, ipcMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import icon from '../../resources/icon.png?asset'
import fs from 'node:fs/promises'
import { Channels } from '@shared/channels'

const BG_LIGHT = '#FAFAF9'
const BG_DARK = '#1D1D16'
const SAVE_MENU_ID = 'save'

function getBackground(): string {
  return nativeTheme.shouldUseDarkColors ? BG_DARK : BG_LIGHT
}

function createWindow(): void {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    backgroundColor: getBackground(),
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    },
    titleBarStyle: 'hiddenInset'
  })

  const handleThemeUpdate = (): void => {
    mainWindow.setBackgroundColor(getBackground())
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

  ipcMain.handle(
    Channels.SaveFile,
    async (_event, { path, content }: { path: string | null; content: string }) => {
      let targetPath = path
      if (!targetPath) {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
          filters: [{ name: 'Markdown', extensions: ['md'] }]
        })
        if (canceled || !filePath) return null
        targetPath = filePath
      }
      await fs.writeFile(targetPath, content, { encoding: 'utf-8' })
      return { path: targetPath }
    }
  )

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  const template: Electron.MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { role: 'close' },
        {
          label: 'New',
          accelerator: 'cmd+N',
          click: () => {
            mainWindow.webContents.send(Channels.NewFile)
          }
        },
        {
          id: SAVE_MENU_ID,
          label: 'Save',
          accelerator: 'cmd+S',
          enabled: false,
          click: () => {
            mainWindow.webContents.send(Channels.SaveRequest)
          }
        },
        {
          label: 'Open…',
          accelerator: 'cmd+O',
          click: async () => {
            const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow)
            if (canceled) return

            const filePath = filePaths[0]
            const content = await fs.readFile(filePath, { encoding: 'utf-8' })
            mainWindow.webContents.send(Channels.FileOpened, { path: filePath, content })
          }
        }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help' }
  ]

  const menu = Menu.buildFromTemplate(template)
  Menu.setApplicationMenu(menu)
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  ipcMain.on(Channels.SetDirty, (_event, dirty: boolean) => {
    const item = Menu.getApplicationMenu()?.getMenuItemById(SAVE_MENU_ID)
    if (item) item.enabled = dirty
  })

  createWindow()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
