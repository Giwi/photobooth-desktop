import { h } from "preact";
import { useRef, useEffect, useState } from "preact/hooks";
import { ACTION_LABELS } from "../lib/constants";
import { formatGpBinding } from "../lib/utils";
import { Select } from "./Select";

interface Props {
  currentLang: string;
  settingsLang: string;
  settingsTheme: string;
  watermark: string | null;
  cameras: { id: string; label: string }[];
  currentDeviceId: string | null;
  countdownDuration: number;
  backgrounds: { file: string; position: string | null }[];
  bgUrls: Record<string, string>;
  keyMap: Record<string, string>;
  gamepadMap: Record<string, number | { axis: number; dir: number }>;
  keyListening: string | null;
  gpListening: string | null;
  gpConnected: boolean;
  t: (key: string) => string;
  onSetSettingsLang: (lang: string) => void;
  onSetSettingsTheme: (theme: string) => void;
  onSetWatermark: (text: string) => void;
  onSetCountdownDuration: (d: number) => void;
  onSwitchCamera: (id: string) => void;
  onSetKeyListening: (action: string | null) => void;
  onSetGpListening: (action: string | null) => void;
  onImportBg: (name: string, dataUrl: string) => void;
  onPickBg: () => void;
  onExportSettings: () => void;
  onImportSettings: (json: string) => void;
  onDeleteBg: (file: string) => void;
  onSetBgPosition: (file: string, position: string | null) => void;
  onSave: () => void;
  onClose: () => void;
}

const POS_OPTIONS: { v: string | null; k: string }[] = [
  { v: "top", k: "settings.posTop" },
  { v: null, k: "settings.posCenter" },
  { v: "bottom", k: "settings.posBottom" },
];

const LANG_OPTIONS: { id: string; label: string }[] = [
  { id: "en", label: "English" },
  { id: "fr", label: "Français" },
  { id: "de", label: "Deutsch" },
  { id: "es", label: "Español" },
];

const THEMES: { id: string; k: string }[] = [
  { id: "dark-violet", k: "theme.darkViolet" },
  { id: "dark-orange", k: "theme.darkOrange" },
  { id: "dark-cyan", k: "theme.darkCyan" },
  { id: "dark-graphite", k: "theme.darkGraphite" },
  { id: "light-blue", k: "theme.lightBlue" },
  { id: "light-green", k: "theme.lightGreen" },
  { id: "light-rose", k: "theme.lightRose" },
];

// Modal settings panel with three tabs (general / background / bindings).
// All mutations are lifted to App via callbacks; file reads happen locally.
export function SettingsOverlay({
  settingsLang, settingsTheme, watermark, cameras, currentDeviceId, countdownDuration,
  backgrounds, bgUrls, keyMap, gamepadMap, keyListening, gpListening, gpConnected, t,
  onSetSettingsLang, onSetSettingsTheme, onSetWatermark, onSetCountdownDuration, onSwitchCamera,
  onSetKeyListening, onSetGpListening, onImportBg, onPickBg, onExportSettings, onImportSettings,
  onDeleteBg, onSetBgPosition, onSave, onClose,
}: Props) {
  const watermarkRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"general" | "background" | "bindings">("general");
  const [dragOver, setDragOver] = useState(false);

  // Keep the watermark input in sync with the saved value.
  useEffect(() => {
    if (watermarkRef.current) watermarkRef.current.value = watermark || "";
  }, [watermark]);

  // Reads a dropped/picked background file into a data URL for import.
  const handleBgFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = () => { if (reader.result) onImportBg(file.name, reader.result as string); };
    reader.readAsDataURL(file);
  };

  // Reads a settings backup (.json) picked from disk.
  const onImportFilePick = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => { if (typeof reader.result === "string") onImportSettings(reader.result); };
      reader.readAsText(file);
    }
    input.value = "";
  };

  // Drag & drop of background images onto the overlay.
  const onDropBg = (e: DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer?.files || []);
    files.forEach((f) => handleBgFile(f));
  };

  const tabs = [
    { id: "general" as const, label: t("settings.tabGeneral") },
    { id: "background" as const, label: t("settings.tabBackground") },
    { id: "bindings" as const, label: t("settings.tabBindings") },
  ];

  return (
    <div id="settings-overlay" className={dragOver ? "dragover" : ""}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
      onDragLeave={(e) => { if (e.target === e.currentTarget) setDragOver(false); }}
      onDrop={onDropBg}>
      <div id="settings-panel">
        <div className="settings-header">
          <h2>{t("settings.title")}</h2>
          <button id="btn-settings-close" onClick={onClose}>
            <i class="bi bi-x-lg" />
          </button>
        </div>
        <div className="settings-tabs">
          {tabs.map((tb) => (
            <button key={tb.id} className={`settings-tab${tab === tb.id ? " active" : ""}`}
              onClick={() => setTab(tb.id)}>
              {tb.label}
            </button>
          ))}
        </div>
        <div className="settings-body">
          {tab === "general" && (
            <div className="settings-col">
              <div className="settings-row">
                <div className="settings-group">
                  <label>{t("settings.language")}</label>
                  <Select value={settingsLang} options={LANG_OPTIONS} onChange={onSetSettingsLang} />
                </div>
                <div className="settings-group">
                  <label>{t("settings.theme")}</label>
                  <Select
                    value={settingsTheme}
                    options={THEMES.map((th) => ({ value: th.id, label: t(th.k) }))}
                    onChange={onSetSettingsTheme}
                  />
                </div>
              </div>
              <div className="settings-group">
                <label>{t("settings.webcam")}</label>
                <div id="cfg-cameras">
                  {cameras.length === 0 && <div className="gp-no-gamepad-msg">{t("settings.noCamera")}</div>}
                  {cameras.map((cam) => (
                    <div key={cam.id} className={`cam-option${cam.id === currentDeviceId ? " active" : ""}`}
                      onClick={() => onSwitchCamera(cam.id)}>
                      {cam.label}
                    </div>
                  ))}
                </div>
              </div>
              <div className="settings-group">
                <label>{t("settings.countdown")}</label>
                <div id="cfg-countdown">
                  {[3, 5, 10].map((d) => (
                    <button key={d} className={`cd-btn${countdownDuration === d ? " active" : ""}`}
                      onClick={() => onSetCountdownDuration(d)}>
                      {d}s
                    </button>
                  ))}
                </div>
              </div>
              <div className="settings-group">
                <label>{t("settings.watermark")}</label>
                <input type="text" ref={watermarkRef} placeholder="e.g. 2026-01-01"
                  onChange={(e) => onSetWatermark((e.target as HTMLInputElement).value)} />
              </div>
              <div className="settings-group">
                <label>{t("settings.backup")}</label>
                <div className="backup-row">
                  <button onClick={onExportSettings} title={t("settings.exportSettings")}>
                    <i className="bi bi-download" /> {t("settings.exportSettings")}
                  </button>
                  <button onClick={() => importFileRef.current?.click()} title={t("settings.importSettings")}>
                    <i className="bi bi-upload" /> {t("settings.importSettings")}
                  </button>
                  <input ref={importFileRef} type="file" accept=".json" hidden onChange={onImportFilePick} />
                </div>
              </div>
            </div>
          )}
          {tab === "background" && (
            <div className="settings-col settings-col-narrow">
              <div
                className={`bg-dropzone${dragOver ? " dragover" : ""}`}
                onClick={onPickBg}
              >
                <i className="bi bi-cloud-arrow-up" />
                <span>{t("settings.dropBg")}</span>
              </div>
              <div className="settings-group">
                <label>{t("settings.backgrounds")}</label>
                <div id="cfg-bg-list">
                  {backgrounds.length === 0 && <div className="gp-no-gamepad-msg">{t("settings.noBackgrounds")}</div>}
                  {backgrounds.map((bg) => (
                    <div key={bg.file} className="bg-item">
                      <div className="bg-item-thumb" style={`background-image:url("${bgUrls[bg.file] || ""}")`} />
                      <div className="bg-item-info">
                        <span className="bg-item-name" title={bg.file}>{bg.file}</span>
                        <div className="bg-item-pos">
                          {POS_OPTIONS.map((opt) => (
                            <button key={opt.v || "center"}
                              className={`bg-pos-btn${bg.position === opt.v ? " active" : ""}`}
                              onClick={() => onSetBgPosition(bg.file, opt.v)}>
                              {t(opt.k)}
                            </button>
                          ))}
                        </div>
                      </div>
                      <button className="bg-del-btn" title={t("settings.bgDelete")}
                        onClick={() => onDeleteBg(bg.file)}>
                        <i className="bi bi-trash3" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          {tab === "bindings" && (
            <div className="settings-col settings-col-narrow">
              <div className="settings-group">
                <label>{t("settings.keybindings")}</label>
                <div id="cfg-keys">
                  {Object.entries(ACTION_LABELS).map(([action, label]) => (
                    <div key={action} className={`key-row${keyListening === action ? " listening" : ""}`}
                      onClick={() => onSetKeyListening(keyListening === action ? null : action)}>
                      <span className="key-label">{t(label)}</span>
                      <span className="key-value">{keyListening === action ? "..." : (keyMap[action] || "")}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="settings-group">
                <label>{t("settings.gamepadBindings")}</label>
                <div id="cfg-gamepad">
                  {!gpConnected && <div className="gp-no-gamepad-msg">{t("settings.noGamepad")}</div>}
                  {gpConnected && Object.entries(ACTION_LABELS).map(([action, label]) => (
                    <div key={action} className={`gp-row${gpListening === action ? " listening" : ""}`}
                      onClick={() => onSetGpListening(gpListening === action ? null : action)}>
                      <span className="gp-label">{t(label)}</span>
                      <span className="gp-value">{gpListening === action ? "..." : formatGpBinding(gamepadMap[action])}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
        <div className="settings-footer">
          <button className="settings-primary" onClick={onSave}>{t("settings.save")}</button>
        </div>
      </div>
    </div>
  );
}
