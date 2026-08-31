import { h } from "preact";
import { Ref, useState } from "preact/hooks";

interface Props {
  videoRef: Ref<HTMLVideoElement>;
  liveCanvasRef: Ref<HTMLCanvasElement>;
  compositorRef: Ref<HTMLCanvasElement>;
  countdownNum: number;
  flashActive: boolean;
  showPreview: boolean;
  previewSrc: string;
  busy: boolean;
  saving: boolean;
  qrVisible: boolean;
  qrDataUrl: string | null;
  emailEnabled: boolean;
  t: (key: string) => string;
  onPreviewAction: (action: string, email?: string) => void;
}

// Renders the stage: live webcam + background overlay canvas, the offscreen
// compositor, countdown, flash, and the post-capture preview with actions.
export function Viewport({
  videoRef, liveCanvasRef, compositorRef,
  countdownNum, flashActive, showPreview, previewSrc, busy, saving, qrVisible, qrDataUrl, emailEnabled, t, onPreviewAction,
}: Props) {
  const [email, setEmail] = useState("");
  return (
    <div id="viewport">
      <div id="video-box">
        <video ref={videoRef} id="video" autoplay playsinline muted />
        <canvas ref={liveCanvasRef} id="live-canvas" />
      </div>
      {/* Offscreen: final image is composed here, hidden from view */}
      <canvas ref={compositorRef} id="compositor" hidden />
      {countdownNum > 0 && <div key={countdownNum} id="countdown" className="animate">{countdownNum}</div>}
      <div id="flash" className={flashActive ? "active" : ""} />
      {showPreview && (
        <div id="preview">
          <img id="preview-img" src={previewSrc} alt="Captured photo" />
          {saving ? (
            <div id="preview-saving">
              <div class="preview-progress" aria-hidden="true"><div class="preview-progress-bar" /></div>
              <span>{t("preview.saving")}</span>
            </div>
          ) : (
            <div id="preview-actions">
              {emailEnabled && (
                <input
                  id="preview-email"
                  type="email"
                  placeholder={t("email.placeholder")}
                  value={email}
                  onChange={(e) => setEmail((e.target as HTMLInputElement).value)}
                />
              )}
              <button id="btn-save" onClick={() => onPreviewAction("save", email)}>
                <i class="bi bi-check-lg" /> {t("btn.save")}
              </button>
              <button id="btn-print" onClick={() => onPreviewAction("print", email)}>
                <i class="bi bi-printer" /> {t("btn.print")}
              </button>
              <button id="btn-cancel" onClick={() => onPreviewAction("cancel")}>
                <i class="bi bi-x-lg" /> {t("btn.discard")}
              </button>
            </div>
          )}
        </div>
      )}
      {qrVisible && qrDataUrl && (
        <div id="qr-overlay">
          <img id="qr-img" src={qrDataUrl} alt="QR code to download the photo" />
          <div id="qr-label">{t("qr.scanToDownload")}</div>
        </div>
      )}
    </div>
  );
}
