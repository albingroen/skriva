import { app } from 'electron'
import { autoUpdater } from 'electron-updater'

export function initAutoUpdater(): void {
  if (!app.isPackaged) {
    return
  }

  autoUpdater.on('checking-for-update', () => {
    console.log('[updater] checking for update')
  })
  autoUpdater.on('update-available', (info) => {
    console.log('[updater] update available:', info.version)
  })
  autoUpdater.on('update-not-available', () => {
    console.log('[updater] up to date')
  })
  autoUpdater.on('download-progress', (progress) => {
    console.log(`[updater] downloading ${progress.percent.toFixed(1)}%`)
  })
  autoUpdater.on('update-downloaded', (info) => {
    console.log('[updater] downloaded:', info.version)
  })
  autoUpdater.on('error', (err) => {
    console.error('[updater] error:', err)
  })

  autoUpdater.checkForUpdatesAndNotify().catch((err: unknown) => {
    console.error('[updater] check failed:', err)
  })
}
