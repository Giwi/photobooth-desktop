// Electron IPC bridge: renderer calls ipcRenderer.invoke through the preload
// contextBridge. Schema types mirror the IPC handlers in src/main/index.ts.
interface ApiBridge {
  invoke(channel: string, params: unknown): Promise<unknown>;
}

declare global {
  interface Window {
    api?: ApiBridge;
  }
}

function invoke<Response>(channel: string, params?: unknown): Promise<Response> {
  return window.api!.invoke(channel, params) as Promise<Response>;
}

type Requests = {
  appReady: { params: void; response: { ok: boolean } };
  toggleFullscreen: { params: void; response: { ok: boolean } };
  bgProgress: { params: { progress: number; name: string }; response: { ok: boolean } };
  getConfig: {
    params: void;
    response: {
      backgrounds: { file: string; position: string | null }[];
      watermark: string | null;
      keys: Record<string, string> | null;
      gamepad: Record<string, any> | null;
      lang: string;
      theme: string;
      i18n: Record<string, string>;
    };
  };
  getBackgroundPath: { params: { file: string }; response: string };
  savePhoto: { params: { image: string; print: boolean }; response: { filename: string; error?: string } };
  saveConfig: {
    params: {
      lang?: string;
      watermark?: string | null;
      keys?: Record<string, string>;
      gamepad?: Record<string, unknown>;
      theme?: string;
    };
    response: { ok: boolean };
  };
  importBackground: { params: { name: string; dataUrl: string }; response: { ok: boolean; error?: string; file?: string } };
  importBackgroundFromPath: { params: { path: string }; response: { ok: boolean; error?: string; file?: string } };
  openBackgroundDialog: { params: void; response: { files: string[] } };
  deleteBackground: { params: { file: string }; response: { ok: boolean; error?: string } };
  setBackgroundPosition: { params: { file: string; position: string | null }; response: { ok: boolean; error?: string } };
  exportSettings: { params: void; response: { path: string; error?: string } };
  importSettings: { params: { json: string }; response: { ok: boolean; error?: string } };
};

export const rpc = {
  request: {
    appReady: (): Promise<Requests["appReady"]["response"]> => invoke("appReady"),
    toggleFullscreen: (): Promise<Requests["toggleFullscreen"]["response"]> => invoke("toggleFullscreen"),
    bgProgress: (params: Requests["bgProgress"]["params"]): Promise<Requests["bgProgress"]["response"]> =>
      invoke("bgProgress", params),
    getConfig: (): Promise<Requests["getConfig"]["response"]> => invoke("getConfig"),
    getBackgroundPath: (params: Requests["getBackgroundPath"]["params"]): Promise<Requests["getBackgroundPath"]["response"]> =>
      invoke("getBackgroundPath", params),
    savePhoto: (params: Requests["savePhoto"]["params"]): Promise<Requests["savePhoto"]["response"]> =>
      invoke("savePhoto", params),
    saveConfig: (params: Requests["saveConfig"]["params"]): Promise<Requests["saveConfig"]["response"]> =>
      invoke("saveConfig", params),
    importBackground: (params: Requests["importBackground"]["params"]): Promise<Requests["importBackground"]["response"]> =>
      invoke("importBackground", params),
    importBackgroundFromPath: (params: Requests["importBackgroundFromPath"]["params"]): Promise<Requests["importBackgroundFromPath"]["response"]> =>
      invoke("importBackgroundFromPath", params),
    openBackgroundDialog: (): Promise<Requests["openBackgroundDialog"]["response"]> =>
      invoke("openBackgroundDialog"),
    deleteBackground: (params: Requests["deleteBackground"]["params"]): Promise<Requests["deleteBackground"]["response"]> =>
      invoke("deleteBackground", params),
    setBackgroundPosition: (params: Requests["setBackgroundPosition"]["params"]): Promise<Requests["setBackgroundPosition"]["response"]> =>
      invoke("setBackgroundPosition", params),
    exportSettings: (): Promise<Requests["exportSettings"]["response"]> => invoke("exportSettings"),
    importSettings: (params: Requests["importSettings"]["params"]): Promise<Requests["importSettings"]["response"]> =>
      invoke("importSettings", params),
  },
};
