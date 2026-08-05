import { h } from "preact";
import { Ref } from "preact/hooks";

interface Props {
  videoRef: Ref<HTMLVideoElement>;
  liveCanvasRef: Ref<HTMLCanvasElement>;
  compositorRef: Ref<HTMLCanvasElement>;
  countdownNum: number;
  flashActive: boolean;
  showPreview: boolean;
  previewSrc: string;
  busy: boolean;
  t: (key: string) => string;
  onPreviewAction: (action: string) => void;
}

// Renders the stage: live webcam + background overlay canvas, the offscreen
// compositor, countdown, flash, and the post-capture preview with actions.
export function Viewport({
  videoRef, liveCanvasRef, compositorRef,
  countdownNum, flashActive, showPreview, previewSrc, busy, t, onPreviewAction,
}: Props) {
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
          <div id="preview-actions">
            <button id="btn-save" onClick={() => onPreviewAction("save")}>
              <i class="bi bi-check-lg" /> {t("btn.save")}
            </button>
            <button id="btn-print" onClick={() => onPreviewAction("print")}>
              <i class="bi bi-printer" /> {t("btn.print")}
            </button>
            <button id="btn-cancel" onClick={() => onPreviewAction("cancel")}>
              <i class="bi bi-x-lg" /> {t("btn.discard")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
