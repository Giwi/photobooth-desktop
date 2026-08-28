import { h } from "preact";
import { useRef, useEffect, useState } from "preact/hooks";
import { ACTION_LABELS } from "../lib/constants";
import { formatGpBinding } from "../lib/utils";
import { Select } from "./Select";
import { IntegrationPanel, Field } from "./IntegrationPanel";
import { rpc } from "../lib/rpc";

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
  integrations: Record<string, any>;
  onSetIntegrations: (integrations: Record<string, any>) => void;
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
  onDeleteBg, onSetBgPosition, integrations, onSetIntegrations, onSave, onClose,
}: Props) {
  const watermarkRef = useRef<HTMLInputElement>(null);
  const importFileRef = useRef<HTMLInputElement>(null);
  const [tab, setTab] = useState<"general" | "background" | "bindings" | "integrations">("general");
  const [dragOver, setDragOver] = useState(false);
  const [ncOpen, setNcOpen] = useState(false);
  const [gdOpen, setGdOpen] = useState(false);
  const [dbOpen, setDbOpen] = useState(false);
  const [odOpen, setOdOpen] = useState(false);
  const [ftpOpen, setFtpOpen] = useState(false);
  const [emailOpen, setEmailOpen] = useState(false);
  const [printerOpen, setPrinterOpen] = useState(false);
  const [printers, setPrinters] = useState<string[]>([]);
  const [oauthBusy, setOauthBusy] = useState<string | null>(null);
  const [oauthError, setOauthError] = useState<string | null>(null);

  // Generic: mutate cfg.integrations.<id>.<field>.
  const setInt = (id: string, field: string, value: any) => {
    onSetIntegrations({ ...integrations, [id]: { ...(integrations[id] || {}), [field]: value } });
  };
  const setTtl = (value: string) => {
    onSetIntegrations({ ...integrations, qrTtl: value });
  };

  // Load the system printers once when the Integrations tab is opened.
  useEffect(() => {
    if (tab === "integrations") {
      rpc.request.listPrinters().then((r) => setPrinters(r.printers || [])).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab]);

  // Run the OAuth flow for a cloud drive and persist the returned tokens.
  const runOAuth = async (id: string) => {
    const cfg = integrations[id] || {};
    setOauthBusy(id);
    setOauthError(null);
    try {
      const res = await rpc.request.oauthAuthorize({
        id,
        clientId: cfg.clientId || "",
        clientSecret: cfg.clientSecret || undefined,
      });
      if (res.ok && res.tokens) {
        onSetIntegrations({ ...integrations, [id]: { ...cfg, tokens: res.tokens } });
      } else {
        setOauthError(t("settings.integrationAuthFailed") + (res.error ? `: ${res.error}` : ""));
      }
    } catch {
      setOauthError(t("settings.integrationAuthFailed"));
    } finally {
      setOauthBusy(null);
    }
  };

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
    { id: "integrations" as const, label: t("settings.tabIntegrations") },
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
            <div className="settings-col">
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
          {tab === "integrations" && (
            <div className="settings-col">
              <IntegrationPanel
                icon="nextcloud.svg"
                title={t("settings.integrationNextcloud")}
                open={ncOpen}
                onToggle={() => setNcOpen(!ncOpen)}
                enabled={!!integrations.nextcloud?.enabled}
                onToggleEnabled={(v) => setInt("nextcloud", "enabled", v)}
                t={t}
                fields={[
                  { id: "baseUrl", label: t("settings.integrationUrl"), placeholder: "https://cloud.example.com" },
                  { id: "folder", label: t("settings.integrationFolder"), placeholder: t("settings.integrationFolderPh") },
                  { id: "username", label: t("settings.login") },
                  { id: "password", label: t("settings.password"), type: "password" },
                ]}
                values={integrations.nextcloud || {}}
                onChange={(f, v) => setInt("nextcloud", f, v)}
              />

              <IntegrationPanel
                title={t("settings.integrationGoogleDrive")}
                open={gdOpen}
                onToggle={() => setGdOpen(!gdOpen)}
                enabled={!!integrations.googledrive?.enabled}
                onToggleEnabled={(v) => setInt("googledrive", "enabled", v)}
                t={t}
                fields={[
                  { id: "clientId", label: t("settings.clientId"), placeholder: "xxxx.apps.googleusercontent.com" },
                  { id: "folder", label: t("settings.integrationFolder"), placeholder: "Photobooth" },
                ]}
                values={integrations.googledrive || {}}
                onChange={(f, v) => setInt("googledrive", f, v)}
                onAuthorize={() => runOAuth("googledrive")}
                authorized={!!integrations.googledrive?.tokens?.access_token}
                footer={oauthBusy === "googledrive" ? <div className="integ-auth-note">{t("settings.integrationAuthBusy")}</div> : null}
              />

              <IntegrationPanel
                title={t("settings.integrationDropbox")}
                open={dbOpen}
                onToggle={() => setDbOpen(!dbOpen)}
                enabled={!!integrations.dropbox?.enabled}
                onToggleEnabled={(v) => setInt("dropbox", "enabled", v)}
                t={t}
                fields={[
                  { id: "clientId", label: t("settings.appKey") },
                  { id: "clientSecret", label: t("settings.appSecret"), type: "password" },
                  { id: "folder", label: t("settings.integrationFolder"), placeholder: "Photobooth" },
                ]}
                values={integrations.dropbox || {}}
                onChange={(f, v) => setInt("dropbox", f, v)}
                onAuthorize={() => runOAuth("dropbox")}
                authorized={!!integrations.dropbox?.tokens?.access_token}
                footer={oauthBusy === "dropbox" ? <div className="integ-auth-note">{t("settings.integrationAuthBusy")}</div> : null}
              />

              <IntegrationPanel
                title={t("settings.integrationOneDrive")}
                open={odOpen}
                onToggle={() => setOdOpen(!odOpen)}
                enabled={!!integrations.onedrive?.enabled}
                onToggleEnabled={(v) => setInt("onedrive", "enabled", v)}
                t={t}
                fields={[
                  { id: "clientId", label: t("settings.clientId"), placeholder: "xxxxxxxx-xxxx-...-xxxx" },
                  { id: "clientSecret", label: t("settings.clientSecret"), type: "password" },
                  { id: "folder", label: t("settings.integrationFolder"), placeholder: "Photobooth" },
                ]}
                values={integrations.onedrive || {}}
                onChange={(f, v) => setInt("onedrive", f, v)}
                onAuthorize={() => runOAuth("onedrive")}
                authorized={!!integrations.onedrive?.tokens?.access_token}
                footer={oauthBusy === "onedrive" ? <div className="integ-auth-note">{t("settings.integrationAuthBusy")}</div> : null}
              />

              <IntegrationPanel
                title={t("settings.integrationFtp")}
                open={ftpOpen}
                onToggle={() => setFtpOpen(!ftpOpen)}
                enabled={!!integrations.ftp?.enabled}
                onToggleEnabled={(v) => setInt("ftp", "enabled", v)}
                t={t}
                fields={[
                  {
                    id: "mode",
                    label: t("settings.ftpMode"),
                    options: [
                      { value: "ftp", label: "FTP" },
                      { value: "sftp", label: "SFTP" },
                    ],
                  },
                  { id: "host", label: t("settings.host") },
                  { id: "port", label: t("settings.port"), type: "number" },
                  { id: "username", label: t("settings.login") },
                  { id: "password", label: t("settings.password"), type: "password" },
                  { id: "folder", label: t("settings.integrationFolder"), placeholder: "/photos" },
                ]}
                values={integrations.ftp || {}}
                onChange={(f, v) => setInt("ftp", f, v)}
              />

              <IntegrationPanel
                title={t("settings.integrationEmail")}
                open={emailOpen}
                onToggle={() => setEmailOpen(!emailOpen)}
                enabled={!!integrations.email?.enabled}
                onToggleEnabled={(v) => setInt("email", "enabled", v)}
                t={t}
                fields={[
                  { id: "host", label: t("settings.smtpHost") },
                  { id: "port", label: t("settings.port"), type: "number" },
                  { id: "secure", label: t("settings.smtpSecure"), type: "checkbox" },
                  { id: "username", label: t("settings.login") },
                  { id: "password", label: t("settings.password"), type: "password" },
                  { id: "from", label: t("settings.emailFrom"), placeholder: "photobooth@example.com" },
                ]}
                values={integrations.email || {}}
                onChange={(f, v) => setInt("email", f, v)}
              />

              <IntegrationPanel
                title={t("settings.integrationPrinter")}
                open={printerOpen}
                onToggle={() => setPrinterOpen(!printerOpen)}
                enabled={!!integrations.printer?.enabled}
                onToggleEnabled={(v) => setInt("printer", "enabled", v)}
                t={t}
                fields={[
                  {
                    id: "printer",
                    label: t("settings.printer"),
                    options: printers.length
                      ? printers.map((p) => ({ value: p, label: p }))
                      : [{ value: "", label: t("settings.noPrinter") }],
                  },
                ]}
                values={integrations.printer || {}}
                onChange={(f, v) => setInt("printer", f, v)}
              />

              {oauthError && <div className="integ-auth-note error">{oauthError}</div>}

              <div className="settings-group">
                <label>{t("settings.qrTtl")}</label>
                <input type="number" min={5} value={integrations.qrTtl ?? 60}
                  onInput={(e) => setTtl((e.target as HTMLInputElement).value)} />
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
