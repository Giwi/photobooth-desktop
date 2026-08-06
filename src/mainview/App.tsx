import { h, Fragment } from "preact";
import { useState, useEffect, useRef, useCallback } from "preact/hooks";
import { rpc } from "./lib/rpc";

import { W, H, AXIS_THRESHOLD, DEFAULT_KEY_MAP, DEFAULT_GP_MAP } from "./lib/constants";
import { drawBgTo, drawVideoCrop, drawWatermark, frameToDataUrl, createStrip } from "./lib/canvas";
import { sleep, keyMatch } from "./lib/utils";

import { BackgroundsBar } from "./components/BackgroundsBar";
import { Viewport } from "./components/Viewport";
import { SettingsBar } from "./components/SettingsBar";
import { SettingsOverlay } from "./components/SettingsOverlay";
import { AboutOverlay } from "./components/AboutOverlay";
import { ToastContainer } from "./components/ToastContainer";
import { ClickAway } from "./components/ClickAway";

// Root component: owns all app state and wires the child components to the
// Electron main process through the typed rpc bridge.
export function App() {
  // --- State ---
  const [bgFiles, setBgFiles] = useState<{ file: string; position: string | null }[]>([]);
  const [selectedBg, setSelectedBg] = useState(0);
  const [mirrorMode, setMirrorMode] = useState(true);
  const [stripMode, setStripMode] = useState(false);
  const [countdownDuration, setCountdownDuration] = useState(3);
  const [watermark, setWatermark] = useState<string | null>(null);
  const [keyMap, setKeyMap] = useState(DEFAULT_KEY_MAP);
  const [gamepadMap, setGamepadMap] = useState(DEFAULT_GP_MAP);
  const [currentLang, setCurrentLang] = useState("en");
  const [i18n, setI18n] = useState<Record<string, string>>({});
  const [theme, setTheme] = useState("dark-violet");
  const [settingsTheme, setSettingsTheme] = useState("dark-violet");
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [previewSrc, setPreviewSrc] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; msg: string; type: string }[]>([]);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [currentDeviceId, setCurrentDeviceId] = useState<string | null>(null);
  const [countdownNum, setCountdownNum] = useState(0);
  const [flashActive, setFlashActive] = useState(false);
  const [keyListening, setKeyListening] = useState<string | null>(null);
  const [gpListening, setGpListening] = useState<string | null>(null);
  const [settingsLang, setSettingsLang] = useState("en");
  const [bgUrls, setBgUrls] = useState<Record<string, string>>({});

  const backgrounds = [null, ...bgFiles];

  // --- Refs ---
  // Mirrors of state for use inside event handlers / rAF loops. Directly
  // reading state there would see stale values (closures over old renders).
  const videoRef = useRef<HTMLVideoElement>(null);
  const liveCanvasRef = useRef<HTMLCanvasElement>(null);
  const compositorRef = useRef<HTMLCanvasElement>(null);
  const bgImageRef = useRef<HTMLImageElement | null>(null);
  const bgReadyRef = useRef(false);
  const keyMapRef = useRef(keyMap);
  const gamepadMapRef = useRef(gamepadMap);
  const busyRef = useRef(busy);
  const showPreviewRef = useRef(showPreview);
  const actionResolverRef = useRef<((action: string) => void) | null>(null);
  const prevGamepadStateRef = useRef<Record<number, boolean>>({});
  const prevAxisStateRef = useRef<Record<string, boolean>>({});
  const mirrorModeRef = useRef(mirrorMode);
  const selectedBgRef = useRef(selectedBg);
  const watermarkRef = useRef(watermark);
  const settingsOpenRef = useRef(settingsOpen);
  const backgroundsRef = useRef(backgrounds);
  const liveCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const compCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  // Keep refs in sync
  keyMapRef.current = keyMap;
  gamepadMapRef.current = gamepadMap;
  busyRef.current = busy;
  showPreviewRef.current = showPreview;
  mirrorModeRef.current = mirrorMode;
  selectedBgRef.current = selectedBg;
  backgroundsRef.current = backgrounds;
  watermarkRef.current = watermark;
  settingsOpenRef.current = settingsOpen;

  // --- i18n ---
  const t = useCallback((key: string) => i18n[key] || key, [i18n]);

  // --- Toast ---
  const notify = useCallback((msg: string, type = "info", ms = 3000) => {
    const id = Date.now();
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), ms);
  }, []);

  // --- Backgrounds refresh ---
  const reloadBgs = useCallback(async () => {
    const config = await rpc.request.getConfig();
    setBgFiles(config.backgrounds);
    const urls: Record<string, string> = {};
    const total = config.backgrounds.length;
    let loaded = 0;
    
    for (const bg of config.backgrounds) {
      try {
        urls[bg.file] = await rpc.request.getBackgroundPath({ file: bg.file });
      } catch {}
      loaded++;
      const progress = Math.round((loaded / total) * 100);
      rpc.request.bgProgress({ progress, name: bg.file });
    }
    
    // Final "done" step
    rpc.request.bgProgress({ progress: 100, name: "Done" });
    
    setBgUrls(urls);
  }, []);

  // --- Canvas drawing ---
  const drawLive = useCallback(() => {
    const ctx = liveCtxRef.current;
    const img = bgImageRef.current;
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);
    if (bgReadyRef.current && img) {
      const bg = backgrounds[selectedBgRef.current];
      const pos = bg?.position || null;
      if (mirrorModeRef.current) {
        ctx.save();
        ctx.translate(W, 0);
        ctx.scale(-1, 1);
        drawBgTo(ctx, img, W, H, pos);
        ctx.restore();
      } else {
        drawBgTo(ctx, img, W, H, pos);
      }
    }
  }, [backgrounds]);

  const loadBg = useCallback((index: number) => {
    const bg = backgrounds[index];
    if (!bg) {
      bgImageRef.current = null;
      bgReadyRef.current = false;
      liveCtxRef.current?.clearRect(0, 0, W, H);
      return;
    }
    rpc.request.getBackgroundPath({ file: bg.file }).then((dataUrl) => {
      const img = new Image();
      img.onload = () => {
        bgImageRef.current = img;
        bgReadyRef.current = true;
        drawLive();
      };
      img.src = dataUrl;
    });
  }, [backgrounds, drawLive]);

  useEffect(() => { drawLive(); }, [selectedBg, mirrorMode, drawLive]);
  useEffect(() => { loadBg(selectedBg); }, [selectedBg, loadBg]);

  // Keep selection valid when backgrounds are added/removed
  useEffect(() => {
    setSelectedBg((i) => Math.min(i, Math.max(0, backgrounds.length - 1)));
  }, [bgFiles]);

  // --- Video mirror ---
  useEffect(() => {
    if (videoRef.current) videoRef.current.style.transform = mirrorMode ? "scaleX(-1)" : "";
  }, [mirrorMode]);

  // --- Init ---
  useEffect(() => {
    (async () => {
      try {
        const lc = liveCanvasRef.current;
        const cc = compositorRef.current;
        if (lc) { lc.width = W; lc.height = H; liveCtxRef.current = lc.getContext("2d"); }
        if (cc) { cc.width = W; cc.height = H; compCtxRef.current = cc.getContext("2d"); }

        const config = await rpc.request.getConfig();
        setWatermark(config.watermark);
        if (config.keys) setKeyMap((prev) => ({ ...prev, ...config.keys! }));
        if (config.gamepad) setGamepadMap((prev) => ({ ...prev, ...config.gamepad! }));
        if (config.lang) setCurrentLang(config.lang);
        if (config.theme) { setTheme(config.theme); setSettingsTheme(config.theme); }
        if (config.i18n) setI18n(config.i18n);
        await reloadBgs();

        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: W }, height: { ideal: H }, aspectRatio: { ideal: 3 / 2 } },
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        const track = stream.getVideoTracks()[0];
        if (track) setCurrentDeviceId(track.getSettings().deviceId ?? null);
      } catch (e) {
        console.error(e);
      } finally {
        await new Promise((resolve) => setTimeout(resolve, 500));
        rpc.request.appReady();
      }
    })();
  }, []);

  // --- CEF file drag-drop: must prevent default at document level or drops navigate the view ---
  useEffect(() => {
    const prevent = (e: DragEvent) => e.preventDefault();
    document.addEventListener("dragover", prevent);
    document.addEventListener("drop", prevent);
    return () => {
      document.removeEventListener("dragover", prevent);
      document.removeEventListener("drop", prevent);
    };
  }, []);

  // --- Dispatch ---
  function dispatchAction(action: string) {
    if (action === "capture") { if (!busyRef.current) capture(); }
    else if (action === "save") { if (showPreviewRef.current) actionResolverRef.current?.("save"); }
    else if (action === "print") { if (showPreviewRef.current) actionResolverRef.current?.("print"); }
    else if (action === "cancel") { if (showPreviewRef.current) actionResolverRef.current?.("cancel"); }
    else if (action === "prevBg") {
      const len = backgroundsRef.current.length;
      if (!busyRef.current && len)
        setSelectedBg((i) => (i - 1 + len) % len);
    }
    else if (action === "nextBg") {
      const len = backgroundsRef.current.length;
      if (!busyRef.current && len)
        setSelectedBg((i) => (i + 1) % len);
    }
    else if (action === "mirror") setMirrorMode((m) => !m);
    else if (action === "strip") setStripMode((s) => !s);
  }

  // --- Keyboard ---
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (settingsOpenRef.current) return;
      if (showPreviewRef.current) return;
      const k = e.key;
      if (k === "ArrowLeft" || k === "ArrowRight") {
        e.preventDefault();
        dispatchAction(k === "ArrowLeft" ? "prevBg" : "nextBg");
        return;
      }
      for (const [action, binding] of Object.entries(keyMapRef.current)) {
        if (keyMatch(k, binding) || (action === "capture" && e.code === "Space")) {
          e.preventDefault();
          dispatchAction(action);
          return;
        }
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  // --- Gamepad ---
  useEffect(() => {
    const poll = () => {
      const gp = Array.from(navigator.getGamepads()).find(Boolean);
      if (!gp) { requestAnimationFrame(poll); return; }
      const gmap = gamepadMapRef.current;

      for (const [action, binding] of Object.entries(gmap)) {
        if (binding == null) continue;
        if (typeof binding === "number") {
          const pressed = gp.buttons[binding]?.pressed;
          const wasPressed = prevGamepadStateRef.current[binding];
          if (pressed && !wasPressed) dispatchAction(action);
          prevGamepadStateRef.current[binding] = pressed || false;
        } else {
          const val = gp.axes[binding.axis] || 0;
          const active = binding.dir > 0 ? val > AXIS_THRESHOLD : val < -AXIS_THRESHOLD;
          const key = `a${binding.axis}:${binding.dir}`;
          const wasActive = prevAxisStateRef.current[key];
          if (active && !wasActive) dispatchAction(action);
          prevAxisStateRef.current[key] = active;
        }
      }
      requestAnimationFrame(poll);
    };

    const onConnect = (e: GamepadEvent) => {
      notify(`${t("notify.gamepadConnected")} ${e.gamepad.id}`, "success");
      prevGamepadStateRef.current = {};
      prevAxisStateRef.current = {};
    };
    const onDisconnect = (e: GamepadEvent) => {
      notify(`${t("notify.gamepadDisconnected")} ${e.gamepad.id}`, "error");
    };

    window.addEventListener("gamepadconnected", onConnect);
    window.addEventListener("gamepaddisconnected", onDisconnect);

    // Start polling immediately to catch already-connected gamepads
    requestAnimationFrame(poll);

    return () => {
      window.removeEventListener("gamepadconnected", onConnect);
      window.removeEventListener("gamepaddisconnected", onDisconnect);
    };
  }, [notify, t]);

  // --- Capture flow ---
  async function capture() {
    if (busy) return;
    setBusy(true);
    if (stripMode) await captureStrip();
    else await captureSingle();
    setBusy(false);
  }

  async function captureSingle() {
    const video = videoRef.current;
    const compCtx = compCtxRef.current;
    if (!video || !compCtx) return;

    for (let i = countdownDuration; i >= 1; i--) {
      setCountdownNum(i);
      await sleep(700);
      setCountdownNum(0);
      await sleep(100);
    }

    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 80);

    if (mirrorMode) {
      compCtx.save();
      compCtx.translate(W, 0);
      compCtx.scale(-1, 1);
      drawVideoCrop(compCtx, video);
      compCtx.restore();
    } else {
      drawVideoCrop(compCtx, video);
    }
    if (bgReadyRef.current && bgImageRef.current) {
      const bg = backgroundsRef.current[selectedBgRef.current];
      drawBgTo(compCtx, bgImageRef.current, W, H, bg?.position || null);
    }
    if (watermarkRef.current) drawWatermark(compCtx, watermarkRef.current);
    const imageData = compCtx.getImageData(0, 0, W, H);
    const dataUrl = frameToDataUrl(imageData);

    setPreviewSrc(dataUrl);
    setShowPreview(true);
    const action = await new Promise<string>((resolve) => { actionResolverRef.current = resolve; });
    setShowPreview(false);
    if (action !== "cancel") await savePhoto(dataUrl, action === "print");
  }

  async function captureStrip() {
    const video = videoRef.current;
    const compCtx = compCtxRef.current;
    if (!video || !compCtx) return;
    const frames: ImageData[] = [];

    for (let shot = 0; shot < 4; shot++) {
      for (let i = countdownDuration; i >= 1; i--) {
        setCountdownNum(i);
        await sleep(700);
        setCountdownNum(0);
        await sleep(100);
      }
      setFlashActive(true);
      setTimeout(() => setFlashActive(false), 80);

      if (mirrorMode) {
        compCtx.save();
        compCtx.translate(W, 0);
        compCtx.scale(-1, 1);
        drawVideoCrop(compCtx, video);
        compCtx.restore();
      } else {
        drawVideoCrop(compCtx, video);
      }
      if (bgReadyRef.current && bgImageRef.current) {
        const bg = backgroundsRef.current[selectedBgRef.current];
        drawBgTo(compCtx, bgImageRef.current, W, H, bg?.position || null);
      }
      if (watermarkRef.current) drawWatermark(compCtx, watermarkRef.current);
      frames.push(compCtx.getImageData(0, 0, W, H));
      if (shot < 3) await sleep(500);
    }

    const stripUrl = createStrip(frames);
    setPreviewSrc(stripUrl);
    setShowPreview(true);
    const action = await new Promise<string>((resolve) => { actionResolverRef.current = resolve; });
    setShowPreview(false);
    if (action !== "cancel") await savePhoto(stripUrl, action === "print");
  }

  async function savePhoto(dataUrl: string, print: boolean) {
    try {
      const result = await rpc.request.savePhoto({ image: dataUrl, print });
      if (result.error) notify(result.error, "error");
      else notify(print ? t("notify.savedPrint") : t("notify.saved"), "success");
    } catch {
      notify(t("notify.saveFailed"), "error");
    }
  }

  // --- Camera ---
  async function switchCamera(deviceId: string) {
    const video = videoRef.current;
    if (!video) return;
    const stream = await navigator.mediaDevices.getUserMedia({
      video: { deviceId: { exact: deviceId }, width: { ideal: W }, height: { ideal: H }, aspectRatio: { ideal: 3 / 2 } },
    });
    const old = video.srcObject as MediaStream | null;
    if (old) old.getTracks().forEach((t) => t.stop());
    video.srcObject = stream;
    await video.play();
    setCurrentDeviceId(deviceId);
    notify(t("notify.cameraSwitched"), "info", 2000);
  }

  async function populateCameras() {
    const devices = await navigator.mediaDevices.enumerateDevices();
    setCameras(devices.filter((d) => d.kind === "videoinput").map((d, i) => ({
      id: d.deviceId, label: d.label || `Camera ${i + 1}`,
    })));
  }

  useEffect(() => { if (settingsOpen) populateCameras(); }, [settingsOpen]);

  // --- Settings key listening ---
  useEffect(() => {
    if (!settingsOpen || !keyListening) return;
    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setKeyMap((prev) => ({ ...prev, [keyListening!]: e.key }));
      setKeyListening(null);
    };
    document.addEventListener("keydown", handler, true);
    return () => document.removeEventListener("keydown", handler, true);
  }, [settingsOpen, keyListening]);

  // --- Settings gamepad rebind ---
  useEffect(() => {
    if (!gpListening || !settingsOpen) return;
    let raf: number;
    const poll = () => {
      const gp = navigator.getGamepads()[0];
      if (!gp) { setGpListening(null); return; }
      for (let i = 0; i < gp.buttons.length; i++) {
        if (gp.buttons[i]?.pressed) {
          setGamepadMap((prev) => ({ ...prev, [gpListening]: i }));
          setGpListening(null);
          return;
        }
      }
      for (let i = 0; i < gp.axes.length; i++) {
        const val = gp.axes[i] || 0;
        if (Math.abs(val) > 0.7) {
          setGamepadMap((prev) => ({ ...prev, [gpListening]: { axis: i, dir: val > 0 ? 1 : -1 } }));
          setGpListening(null);
          return;
        }
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [gpListening, settingsOpen]);

  // --- Settings open/close sync ---
  useEffect(() => {
    if (settingsOpen) {
      setSettingsLang(currentLang);
      setSettingsTheme(theme);
      setGpListening(null);
      setKeyListening(null);
    }
  }, [settingsOpen, currentLang, watermark]);

  // --- Theme ---
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  // --- Settings save ---
  async function saveSettings() {
    setWatermark(watermark);
    setCurrentLang(settingsLang);
    setTheme(settingsTheme);
    await rpc.request.saveConfig({
      lang: settingsLang, watermark, keys: keyMap, gamepad: gamepadMap, theme: settingsTheme,
    });
    const config = await rpc.request.getConfig();
    if (config.i18n) setI18n(config.i18n);
    setSettingsOpen(false);
    notify(t("notify.configSaved"), "success");
  }

  async function importBackground(name: string, dataUrl: string) {
    const extOk = /\.(png|jpe?g|webp)$/i.test(name);
    const mimeOk = /^data:image\/(png|jpe?g|webp)[;,]/i.test(dataUrl);
    if (!extOk || !mimeOk) { notify(t("notify.bgInvalidType"), "error"); return; }
    try {
      const res = await rpc.request.importBackground({ name, dataUrl });
      if (!res.ok) { notify(res.error || "Import failed", "error"); return; }
      await reloadBgs();
      notify(t("notify.bgImported"), "success");
    } catch {
      notify(t("notify.bgImportFailed"), "error");
    }
  }

  async function importBackgroundFromPath(path: string) {
    try {
      const res = await rpc.request.importBackgroundFromPath({ path });
      if (!res.ok) { notify(res.error || "Import failed", "error"); return; }
      await reloadBgs();
      notify(t("notify.bgImported"), "success");
    } catch {
      notify(t("notify.bgImportFailed"), "error");
    }
  }

  async function pickBackgrounds() {
    try {
      const { files } = await rpc.request.openBackgroundDialog();
      for (const path of files) await importBackgroundFromPath(path);
    } catch {
      notify(t("notify.bgImportFailed"), "error");
    }
  }

  async function exportSettings() {
    try {
      const res = await rpc.request.exportSettings();
      if (!res.path) { notify(res.error || "Export failed", "error"); return; }
      notify(t("notify.settingsExported").replace("{path}", res.path), "success", 5000);
    } catch {
      notify(t("notify.settingsExportFailed"), "error");
    }
  }

  async function importSettings(json: string) {
    try {
      const res = await rpc.request.importSettings({ json });
      if (!res.ok) { notify(res.error || "Import failed", "error"); return; }
      notify(t("notify.settingsImported"), "success");
      setTimeout(() => location.reload(), 600);
    } catch {
      notify(t("notify.settingsImportFailed"), "error");
    }
  }

  async function deleteBackground(file: string) {
    try {
      const res = await rpc.request.deleteBackground({ file });
      if (!res.ok) { notify(res.error || "Delete failed", "error"); return; }
      await reloadBgs();
      notify(t("notify.bgDeleted"), "success");
    } catch {
      notify(t("notify.bgImportFailed"), "error");
    }
  }

  async function setBgPosition(file: string, position: string | null) {
    try {
      await rpc.request.setBackgroundPosition({ file, position });
      await reloadBgs();
    } catch {}
  }

  const gpConnected = (() => { try { return !!Array.from(navigator.getGamepads()).find(Boolean); } catch { return false; } })();

  return (
    <>
      <BackgroundsBar backgrounds={backgrounds} selected={selectedBg} onSelect={setSelectedBg} bgUrls={bgUrls} />

      <Viewport
        videoRef={videoRef} liveCanvasRef={liveCanvasRef} compositorRef={compositorRef}
        countdownNum={countdownNum} flashActive={flashActive}
        showPreview={showPreview} previewSrc={previewSrc} busy={busy}
        t={t} onPreviewAction={(a) => actionResolverRef.current?.(a)}
      />

      <SettingsBar
        mirrorMode={mirrorMode} stripMode={stripMode} helpOpen={helpOpen}
        keyMap={keyMap} t={t}
        onToggleMirror={() => setMirrorMode((m) => !m)}
        onToggleStrip={() => setStripMode((s) => !s)}
        onToggleHelp={() => setHelpOpen((h) => !h)}
        onToggleFullscreen={() => rpc.request.toggleFullscreen()}
        onOpenAbout={() => setAboutOpen(true)}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <button id="capture" disabled={busy} onClick={() => capture()} />

      <ToastContainer toasts={toasts} />

      {settingsOpen && (
        <SettingsOverlay
          currentLang={currentLang} settingsLang={settingsLang} settingsTheme={settingsTheme}
          watermark={watermark}
          cameras={cameras} currentDeviceId={currentDeviceId} countdownDuration={countdownDuration}
          backgrounds={bgFiles} bgUrls={bgUrls}
          keyMap={keyMap} gamepadMap={gamepadMap} keyListening={keyListening}
          gpListening={gpListening} gpConnected={gpConnected} t={t}
          onSetSettingsLang={setSettingsLang} onSetSettingsTheme={setSettingsTheme}
          onSetWatermark={setWatermark}
          onSetCountdownDuration={setCountdownDuration}
          onSwitchCamera={switchCamera} onSetKeyListening={setKeyListening}
          onSetGpListening={setGpListening} onSave={saveSettings}
          onImportBg={importBackground}
          onPickBg={pickBackgrounds}
          onExportSettings={exportSettings}
          onImportSettings={importSettings}
          onDeleteBg={deleteBackground}
          onSetBgPosition={setBgPosition}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {helpOpen && <ClickAway onClick={() => setHelpOpen(false)} />}

      {aboutOpen && <AboutOverlay t={t} onClose={() => setAboutOpen(false)} />}
    </>
  );
}
