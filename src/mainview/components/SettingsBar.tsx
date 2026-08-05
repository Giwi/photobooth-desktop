import { h } from "preact";
import { ACTION_LABELS, KEY_DISPLAY } from "../lib/constants";

interface Props {
  mirrorMode: boolean;
  stripMode: boolean;
  helpOpen: boolean;
  keyMap: Record<string, string>;
  t: (key: string) => string;
  onToggleMirror: () => void;
  onToggleStrip: () => void;
  onToggleHelp: () => void;
  onToggleFullscreen: () => void;
  onOpenAbout: () => void;
  onOpenSettings: () => void;
}

// Bottom-right control pill: mirror, strip, keyboard help, fullscreen,
// settings and about.
export function SettingsBar({
  mirrorMode, stripMode, helpOpen, keyMap, t,
  onToggleMirror, onToggleStrip, onToggleHelp, onToggleFullscreen, onOpenAbout, onOpenSettings,
}: Props) {
  return (
    <div id="settings">
      <button className={`setting-btn${mirrorMode ? " active" : ""}`} onClick={onToggleMirror} title={t("title.mirror")}>
        <i class="bi bi-arrow-left-right" />
      </button>
      <button className={`setting-btn${stripMode ? " active" : ""}`} onClick={onToggleStrip} title={t("title.strip")}>
        <i class="bi bi-grid" />
      </button>
      <div id="help-picker-wrap">
        <button className="setting-btn" onClick={(e) => { e.stopPropagation(); onToggleHelp(); }} title={t("title.help")}>
          <i class="bi bi-keyboard" />
        </button>
        {helpOpen && (
          <div id="help-popup">
            {Object.entries(ACTION_LABELS).map(([action, label]) => {
              const key = keyMap[action];
              if (!key) return null;
              return (
                <div key={action} className="help-row">
                  <span>{t(label)}</span>
                  <kbd>{KEY_DISPLAY[key] || key}</kbd>
                </div>
              );
            })}
          </div>
        )}
      </div>
      <button className="setting-btn" onClick={(e) => { e.stopPropagation(); onToggleFullscreen(); }} title={t("title.fullscreen")}>
        <i class="bi bi-arrows-fullscreen" />
      </button>
      <button className="setting-btn" onClick={(e) => { e.stopPropagation(); onOpenSettings(); }} title={t("title.settings")}>
        <i class="bi bi-gear" />
      </button>
      <button className="setting-btn" onClick={(e) => { e.stopPropagation(); onOpenAbout(); }} title={t("about.title")}>
        <i class="bi bi-info-circle" />
      </button>
    </div>
  );
}
