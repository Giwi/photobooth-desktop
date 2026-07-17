import { h } from "preact";
import { useRef, useEffect } from "preact/hooks";
import { ACTION_LABELS } from "../lib/constants";
import { formatGpBinding } from "../lib/utils";

interface Props {
  currentLang: string;
  settingsLang: string;
  watermark: string | null;
  cameras: { id: string; label: string }[];
  currentDeviceId: string | null;
  countdownDuration: number;
  keyMap: Record<string, string>;
  gamepadMap: Record<string, number | { axis: number; dir: number }>;
  keyListening: string | null;
  gpListening: string | null;
  gpConnected: boolean;
  t: (key: string) => string;
  onSetSettingsLang: (lang: string) => void;
  onSetCountdownDuration: (d: number) => void;
  onSwitchCamera: (id: string) => void;
  onSetKeyListening: (action: string | null) => void;
  onSetGpListening: (action: string | null) => void;
  onSave: () => void;
  onClose: () => void;
}

export function SettingsOverlay({
  settingsLang, watermark, cameras, currentDeviceId, countdownDuration,
  keyMap, gamepadMap, keyListening, gpListening, gpConnected, t,
  onSetSettingsLang, onSetCountdownDuration, onSwitchCamera,
  onSetKeyListening, onSetGpListening, onSave, onClose,
}: Props) {
  const watermarkRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (watermarkRef.current) watermarkRef.current.value = watermark || "";
  }, [watermark]);

  return (
    <div id="settings-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="settings-panel">
        <div className="settings-header">
          <h2>{t("settings.title")}</h2>
          <button id="btn-settings-close" onClick={onClose}>
            <i class="bi bi-x-lg" />
          </button>
        </div>
        <div className="settings-body">
          <div className="settings-col">
            <div className="settings-group">
              <label>{t("settings.language")}</label>
              <div id="cfg-lang">
                {["en", "fr", "de", "es"].map((lang) => (
                  <button key={lang} className={`lang-btn${settingsLang === lang ? " active" : ""}`}
                    onClick={() => onSetSettingsLang(lang)}>
                    {lang.toUpperCase()}
                  </button>
                ))}
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
              <input type="text" ref={watermarkRef} placeholder="e.g. 2026-01-01" />
            </div>
          </div>
          <div className="settings-col settings-bindings">
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
        </div>
        <div className="settings-footer">
          <button className="settings-primary" onClick={onSave}>{t("settings.save")}</button>
        </div>
      </div>
    </div>
  );
}
