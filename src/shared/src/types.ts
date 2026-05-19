/**
 * A note loaded from disk: its source path and current content.
 */
export type Note = {
  path: string
  content: string
}

/**
 * Payload sent from the renderer to the main process when saving.
 * A `null` path means the user has not yet picked a destination, and
 * the main process should prompt with a Save dialog.
 */
export type SaveFilePayload = {
  path: string | null
  content: string
}

/**
 * Result of a save attempt. `null` means the user cancelled the
 * Save dialog; otherwise the resolved path the file was written to.
 */
export type SaveFileResult = { path: string } | null
