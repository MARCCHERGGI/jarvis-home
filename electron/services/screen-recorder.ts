// Screen recorder — desktopCapturer in main, MediaRecorder in renderer.
//
// Flow: renderer asks for the primary screen source ID, then calls
// getUserMedia with chromeMediaSourceId to grab a zero-copy frame stream.
// MediaRecorder encodes VP9 at 10 Mbps on the GPU (hardware MFT on Windows).
// Final webm blob is sent back via IPC and written to ~/Videos/JARVIS/.

import { app, ipcMain, desktopCapturer } from 'electron';
import { promises as fs } from 'node:fs';
import { join } from 'node:path';

export function registerScreenRecorder() {
  // Return the primary screen source so the renderer can attach to it.
  // Empty thumbnailSize — we don't waste time generating previews.
  ipcMain.handle('rec:get-source', async () => {
    const sources = await desktopCapturer.getSources({
      types: ['screen'],
      thumbnailSize: { width: 0, height: 0 },
    });
    const primary = sources[0];
    return primary ? { id: primary.id, name: primary.name } : null;
  });

  // Save the encoded webm buffer DIRECTLY to the Desktop so the recording
  // appears as an icon — no rummaging in Videos folders. app.getPath('desktop')
  // resolves correctly for both local and OneDrive-synced desktops on Windows.
  ipcMain.handle('rec:save', async (_evt, buffer: ArrayBuffer, filename: string) => {
    try {
      const dir = app.getPath('desktop');
      const filepath = join(dir, filename);
      await fs.writeFile(filepath, Buffer.from(buffer));
      return { ok: true, path: filepath };
    } catch (err: any) {
      return { ok: false, error: err?.message ?? 'save failed' };
    }
  });
}
