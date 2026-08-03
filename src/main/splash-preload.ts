import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electronAPI", {
  onBgProgress: (callback: (data: { progress: number; name: string }) => void) => {
    ipcRenderer.on("bgProgress", (_event, data) => callback(data));
  },
});
