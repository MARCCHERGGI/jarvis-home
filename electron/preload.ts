import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('jarvis', {
  launchApp: (name: string) => ipcRenderer.invoke('launcher:app', name),
  launchUrl: (url: string) => ipcRenderer.invoke('launcher:url', url),
  quit: () => ipcRenderer.invoke('window:quit'),
  platform: process.platform,
  onClap: (callback: () => void) => {
    ipcRenderer.on('clap-detected', () => callback());
    return () => { ipcRenderer.removeAllListeners('clap-detected'); };
  },
  // Data sources
  getStripe:   () => ipcRenderer.invoke('data:stripe'),
  getCrypto:   () => ipcRenderer.invoke('data:crypto'),
  getOpenClaw: () => ipcRenderer.invoke('data:openclaw'),
  getSystem:   () => ipcRenderer.invoke('data:system'),
  getWeather:  () => ipcRenderer.invoke('data:weather'),
  getNews:     () => ipcRenderer.invoke('data:news'),
  getCommits:  () => ipcRenderer.invoke('data:commits'),
  getMorningContext: () => ipcRenderer.invoke('data:morningContext'),
  listCommands: () => ipcRenderer.invoke('cmd:list'),
  runCommand:   (id: string) => ipcRenderer.invoke('cmd:run', id),
  getScreenSource: () => ipcRenderer.invoke('rec:get-source'),
  saveRecording: (buffer: ArrayBuffer, filename: string) =>
    ipcRenderer.invoke('rec:save', buffer, filename),
});

declare global {
  interface Window {
    jarvis: {
      launchApp: (name: string) => Promise<{ ok: boolean; error?: string }>;
      launchUrl: (url: string) => Promise<{ ok: boolean; error?: string }>;
      quit: () => Promise<void>;
      platform: string;
      onClap: (cb: () => void) => () => void;
      getStripe:   () => Promise<any>;
      getCrypto:   () => Promise<any>;
      getOpenClaw: () => Promise<any>;
      getSystem:   () => Promise<any>;
      getWeather:  () => Promise<any>;
      getNews:     () => Promise<any>;
      getCommits:  () => Promise<any>;
      getMorningContext: () => Promise<{ mind: string; warPlan: string; latestNote: string; frontier: string }>;
      listCommands: () => Promise<any>;
      runCommand:   (id: string) => Promise<any>;
      getScreenSource: () => Promise<{ id: string; name: string } | null>;
      saveRecording: (buffer: ArrayBuffer, filename: string) => Promise<{ ok: boolean; path?: string; error?: string }>;
    };
  }
}
