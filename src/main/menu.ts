import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { Channels } from '@shared/channels'
import {
  FORMAT_MENU,
  type FormatMenuEntry,
  type FormatState,
  formatMenuItemId
} from '@shared/format'

import { openFileDialog } from './ipc'

/**
 * Stable id for the Save menu item. The IPC layer flips its
 * `enabled` flag based on whether the renderer has unsaved changes.
 */
export const SAVE_MENU_ID = 'save'

function buildFormatEntry(
  entry: FormatMenuEntry,
  window: BrowserWindow,
  state?: FormatState
): MenuItemConstructorOptions {
  if (entry.kind === 'separator') {
    return { type: 'separator' }
  }

  if (entry.kind === 'submenu') {
    return {
      label: entry.label,
      submenu: entry.entries.map((child) => buildFormatEntry(child, window, state))
    }
  }

  return {
    id: formatMenuItemId(entry.name),
    label: entry.label,
    accelerator: entry.accelerator,
    type: 'checkbox',
    checked: state?.[entry.name] ?? false,
    click: () => {
      window.webContents.send(Channels.FormatCommand, entry.name)
    }
  }
}

/**
 * Builds the Format submenu items from the shared declarative list.
 * Reused for both the menu bar entry (where `state` is omitted and
 * items are later updated via `getMenuItemById`) and the right-click
 * popup (where current `state` is baked into `checked` at build time).
 */
export function buildFormatMenu(
  window: BrowserWindow,
  state?: FormatState
): MenuItemConstructorOptions[] {
  return FORMAT_MENU.map((entry) => buildFormatEntry(entry, window, state))
}

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
    { label: 'Format', submenu: buildFormatMenu(window) },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help' }
  ]

  return Menu.buildFromTemplate(template)
}
