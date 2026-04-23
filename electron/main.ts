import { app, BrowserWindow, ipcMain, screen } from 'electron';
import path from 'node:path';
import { launchApp, launchUrl } from './services/launcher';
import { startNativeClap } from './services/clap-native';
import { registerDataSources } from './services/data-sources';
import { registerScreenRecorder } from './services/screen-recorder';

// ── GPU FLAGS — MINIMAL, BATTLE-TESTED ──
// Previous rounds added a whole kitchen-sink of "perf" flags that
// triggered a NOTREACHED assertion inside Chromium when the wake
// sequence started audio + animation. Stripped to the original three
// plus two safe foreground-throttling disables. Everything else is
// removed — speculative flags cause Chromium native-code crashes.
app.commandLine.appendSwitch('use-angle', 'gl');
app.commandLine.appendSwitch('disable-gpu-sandbox');
app.commandLine.appendSwitch('no-sandbox');

// Safe: just tells Chromium "this is a foreground kiosk app, don't
// throttle rAF / timers when you think it's backgrounded."
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');

// Clap detection runs in main process via ffmpeg — that's not a
// "user gesture" to Chromium, so HTMLMediaElement.play() was being
// blocked by autoplay policy and music went silent. Allowing autoplay
// without a gesture is the standard kiosk-app posture.
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');

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
      // Never throttle this renderer — even if the OS thinks another
      // window is focused. JARVIS_HOME is a full-screen kiosk app and
      // must keep animating at full speed. This is the main-window
      // counterpart to the command-line flags above.
      backgroundThrottling: false,
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
