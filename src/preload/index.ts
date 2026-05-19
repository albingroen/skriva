import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

import { Channels } from '@shared/channels'
import type { Note, SaveFileResult } from '@shared/types'

/**
 * Subscribes to a one-way `webContents.send` channel and returns a
 * disposer that removes the listener. The `_event` arg is stripped
 * so callers see only the payload(s) the main process sent.
 */
function subscribe<T extends unknown[]>(
  channel: string,
  callback: (...args: T) => void
): () => void {
  const listener = (_event: IpcRendererEvent, ...args: T): void => {
    callback(...args)
  }

  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

/**
 * Renderer-facing surface for everything the main process exposes.
 * Exported as `window.api` after going through `contextBridge`.
 */
export const api = {
  /** Fires when the user opens a file from the application menu. */
  onFileOpened: (callback: (note: Note) => void): (() => void) =>
    subscribe<[Note]>(Channels.FileOpened, callback),

  /** Fires when the user invokes Save (⌘S) from the menu. */
  onSaveRequest: (callback: () => void): (() => void) =>
    subscribe<[]>(Channels.SaveRequest, callback),

  /** Fires when the user invokes New (⌘N) from the menu. */
  onNewFile: (callback: () => void): (() => void) => subscribe<[]>(Channels.NewFile, callback),

  /**
   * Writes content to `path`. If `path` is null the main process
   * shows a Save dialog and returns the chosen path (or null if the
   * user cancelled).
   */
  saveFile: (path: string | null, content: string): Promise<SaveFileResult> =>
    ipcRenderer.invoke(Channels.SaveFile, { path, content }),

  /** Notifies the main process so it can toggle the Save menu item. */
  setDirty: (isDirty: boolean): void => {
    ipcRenderer.send(Channels.SetDirty, isDirty)
  },

  /**
   * Reports the outcome of a save triggered by `SaveRequest`. Used by
   * the close-with-unsaved-changes flow in main to know whether to
   * proceed with closing the window.
   */
  notifySaveCompleted: (success: boolean): void => {
    ipcRenderer.send(Channels.SaveCompleted, success)
  }
}

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
