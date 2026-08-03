import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("api", {
  invoke: (channel: string, params: unknown) => ipcRenderer.invoke(channel, params),
});
