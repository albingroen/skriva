import { contextBridge, ipcRenderer, IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { Note } from '@shared/types'
import { Channels } from '@shared/channels'

function subscribe<T extends unknown[]>(
  channel: string,
  callback: (...args: T) => void
): () => void {
  const listener = (_event: IpcRendererEvent, ...args: T): void => callback(...args)
  ipcRenderer.on(channel, listener)
  return () => ipcRenderer.removeListener(channel, listener)
}

export const api = {
  onFileOpened: (callback: (note: Note) => void) =>
    subscribe<[Note]>(Channels.FileOpened, callback),
  onSaveRequest: (callback: () => void) => subscribe<[]>(Channels.SaveRequest, callback),
  onNewFile: (callback: () => void) => subscribe<[]>(Channels.NewFile, callback),
  saveFile: (path: string | null, content: string): Promise<{ path: string } | null> =>
    ipcRenderer.invoke(Channels.SaveFile, { path, content }),
  setDirty: (dirty: boolean): void => ipcRenderer.send(Channels.SetDirty, dirty)
}

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
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
