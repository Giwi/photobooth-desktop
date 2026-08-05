import { h } from "preact";

interface Props {
  t: (key: string) => string;
  onClose: () => void;
}

// Modal "About" dialog: app info, version and external links. Links open in
// the default browser via the main-process window-open handler.
export function AboutOverlay({ t, onClose }: Props) {
  return (
    <div id="about-overlay" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div id="about-panel">
        <div className="about-header">
          <h2>{t("about.title")}</h2>
          <button id="btn-about-close" onClick={onClose}>
            <i class="bi bi-x-lg" />
          </button>
        </div>
        <div className="about-body">
          <div className="about-logo">
            <i class="bi bi-camera-fill" />
          </div>
          <h3>Photobooth Desktop</h3>
          <p className="about-version">v0.0.3</p>
          <p className="about-description">{t("about.description")}</p>
          <div className="about-links">
            <a href="https://giwi.fr" target="_blank" rel="noopener noreferrer">
              <i class="bi bi-globe" /> giwi.fr
            </a>
            <a href="https://github.com/Giwi/photobooth-desktop" target="_blank" rel="noopener noreferrer">
              <i class="bi bi-github" /> GitHub
            </a>
          </div>
          <p className="about-copyright">© 2024 GiwiSoft</p>
        </div>
      </div>
    </div>
  );
}
