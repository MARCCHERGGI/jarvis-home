import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { launchApp, launchUrl } from './services/launcher';
import { startNativeClap } from './services/clap-native';
import { registerDataSources } from './services/data-sources';
import { registerScreenRecorder } from './services/screen-recorder';

// Windows GPU process has a flaky code-34 crash with WebGL + Three.js.
// Fall back to ANGLE + in-process GPU so the window stays stable.
app.commandLine.appendSwitch('use-angle', 'gl');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

let win: BrowserWindow | null = null;

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  win = new BrowserWindow({
    width,
    height,
    fullscreen: true,
    frame: false,
    backgroundColor: '#000000',
    show: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      webviewTag: true,  // enables <webview> for embedded web panels
    },
  });

  win.once('ready-to-show', () => win?.show());

  // Auto-grant ALL permissions (mic, camera, etc) for clap detection
  win.webContents.session.setPermissionRequestHandler((_wc, _permission, callback) => {
    callback(true);
  });
  win.webContents.session.setPermissionCheckHandler(() => true);

  const devUrl = process.env.ELECTRON_RENDERER_URL;
  if (devUrl) {
    win.loadURL(devUrl);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();

  // Start clap detector (ffmpeg captures mic in main process — no Chromium issues)
  startNativeClap(win!);

  // Register data sources for real panels (Stripe, crypto, OpenClaw, commands)
  registerDataSources();

  // Screen recorder (T key toggles capture → saves to ~/Videos/JARVIS/)
  registerScreenRecorder();

  ipcMain.handle('launcher:app', async (_evt, name: string) => launchApp(name));
  ipcMain.handle('launcher:url', async (_evt, url: string) => launchUrl(url));
  ipcMain.handle('window:quit', () => app.quit());

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
