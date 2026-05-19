import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { Channels } from '@shared/channels'

import { openFileDialog } from './ipc'

/**
 * Stable id for the Save menu item. The IPC layer flips its
 * `enabled` flag based on whether the renderer has unsaved changes.
 */
export const SAVE_MENU_ID = 'save'

/**
 * Builds the application menu bound to the given window. File-system
 * work lives in `./ipc`; this module only describes the menu shape
 * and forwards user actions through Channels.
 */
export function buildAppMenu(window: BrowserWindow): Menu {
  const template: MenuItemConstructorOptions[] = [
    { role: 'appMenu' },
    {
      label: 'File',
      submenu: [
        { role: 'close' },
        {
          label: 'New',
          accelerator: 'cmd+N',
          click: () => {
            window.webContents.send(Channels.NewFile)
          }
        },
        {
          id: SAVE_MENU_ID,
          label: 'Save',
          accelerator: 'cmd+S',
          enabled: false,
          click: () => {
            window.webContents.send(Channels.SaveRequest)
          }
        },
        {
          label: 'Open…',
          accelerator: 'cmd+O',
          click: async () => {
            await openFileDialog(window)
          }
        }
      ]
    },
    { role: 'editMenu' },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help' }
  ]

  return Menu.buildFromTemplate(template)
}
