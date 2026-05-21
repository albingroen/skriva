import { app, BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { Channels } from '@shared/channels'
import {
  FORMAT_MENU,
  type FormatMenuEntry,
  type FormatState,
  formatMenuItemId
} from '@shared/format'

/**
 * Stable id for the Save menu item. The IPC layer flips its
 * `enabled` flag based on whether the focused window has unsaved
 * changes.
 */
export const SAVE_MENU_ID = 'save'

/**
 * Handlers wired into the application menu. Provided by `index.ts`
 * so this module can stay free of `window.ts` / `ipc.ts` dependencies
 * and the menu can resolve the focused window at click time.
 */
export type AppMenuHandlers = {
  onNew: () => void
  onOpen: () => void | Promise<void>
  onOpenPreferences: () => void
}

function buildFormatEntry(
  entry: FormatMenuEntry,
  resolveTarget: () => BrowserWindow | null,
  state?: FormatState
): MenuItemConstructorOptions {
  if (entry.kind === 'separator') {
    return { type: 'separator' }
  }

  if (entry.kind === 'submenu') {
    return {
      label: entry.label,
      submenu: entry.entries.map((child) => buildFormatEntry(child, resolveTarget, state))
    }
  }

  return {
    id: formatMenuItemId(entry.name),
    label: entry.label,
    accelerator: entry.accelerator,
    type: 'checkbox',
    checked: state?.[entry.name] ?? false,
    click: () => {
      const target = resolveTarget()

      if (target) {
        target.webContents.send(Channels.FormatCommand, entry.name)
      }
    }
  }
}

/**
 * Builds the Format submenu items from the shared declarative list.
 * `resolveTarget` is invoked at click time to find the window the
 * command should be sent to — the menu bar passes
 * `BrowserWindow.getFocusedWindow`, the context-menu popup passes the
 * sender window so clicks always route back to the originating
 * window even if focus shifts mid-popup.
 */
export function buildFormatMenu(
  resolveTarget: () => BrowserWindow | null,
  state?: FormatState
): MenuItemConstructorOptions[] {
  return FORMAT_MENU.map((entry) => buildFormatEntry(entry, resolveTarget, state))
}

/**
 * Builds the global application menu. The menu is window-agnostic:
 * click handlers either invoke the injected handlers from
 * `index.ts` (New / Open / Preferences) or resolve the focused
 * window at click time (Save / Format). Per-window state (Save
 * enabled, Format checkmarks) is pushed into the menu via
 * `syncMenuToFocusedWindow` on focus changes.
 */
export function buildAppMenu(handlers: AppMenuHandlers): Menu {
  const isMac = process.platform === 'darwin'

  const appMenu: MenuItemConstructorOptions = isMac
    ? {
        label: app.name,
        submenu: [
          { role: 'about' },
          { type: 'separator' },
          {
            label: 'Preferences…',
            accelerator: 'CmdOrCtrl+,',
            click: handlers.onOpenPreferences
          },
          { type: 'separator' },
          { role: 'services' },
          { type: 'separator' },
          { role: 'hide' },
          { role: 'hideOthers' },
          { role: 'unhide' },
          { type: 'separator' },
          { role: 'quit' }
        ]
      }
    : { role: 'appMenu' }

  const template: MenuItemConstructorOptions[] = [
    appMenu,
    {
      label: 'File',
      submenu: [
        { role: 'close' },
        {
          label: 'New',
          accelerator: 'cmd+N',
          click: () => {
            void handlers.onNew()
          }
        },
        {
          id: SAVE_MENU_ID,
          label: 'Save',
          accelerator: 'cmd+S',
          enabled: false,
          click: () => {
            const focused = BrowserWindow.getFocusedWindow()

            if (focused) {
              focused.webContents.send(Channels.SaveRequest)
            }
          }
        },
        {
          label: 'Open…',
          accelerator: 'cmd+O',
          click: () => {
            void handlers.onOpen()
          }
        }
      ]
    },
    { role: 'editMenu' },
    { label: 'Format', submenu: buildFormatMenu(() => BrowserWindow.getFocusedWindow()) },
    { role: 'viewMenu' },
    { role: 'windowMenu' },
    { role: 'help' }
  ]

  return Menu.buildFromTemplate(template)
}
