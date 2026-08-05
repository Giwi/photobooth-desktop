import { W, H } from "./constants";

// Parses a background position string ("top", "left bottom", "40%"...) into
// normalized (0..1) anchor coordinates. Defaults to center.
export function parsePosition(pos: string | null): { x: number; y: number } {
  if (!pos) return { x: 0.5, y: 0.5 };
  const parts = pos.trim().split(/\s+/);
  let x = 0.5, y = 0.5, xSet = false, ySet = false;
  for (const p of parts) {
    if (p === "top") { y = 0; ySet = true; }
    else if (p === "bottom") { y = 1; ySet = true; }
    else if (p === "left") { x = 0; xSet = true; }
    else if (p === "right") { x = 1; xSet = true; }
    else if (p.endsWith("%")) {
      const v = parseFloat(p) / 100;
      if (!ySet) { y = v; ySet = true; } else { x = v; xSet = true; }
    }
  }
  return { x, y };
}

// Fills the canvas with the background image, cover-fit and anchored at the
// requested position (so e.g. "top" shows the top of a tall backdrop).
export function drawBgTo(c: CanvasRenderingContext2D, img: HTMLImageElement, cw: number, ch: number, position: string | null) {
  const iw = img.naturalWidth || img.width;
  const ih = img.naturalHeight || img.height;
  const scale = Math.min(cw / iw, ch / ih);
  const sw = iw * scale, sh = ih * scale;
  const { x, y } = parsePosition(position);
  c.drawImage(img, (cw - sw) * x, (ch - sh) * y, sw, sh);
}

// Center-crops the live video to the fixed capture aspect ratio (cover-fit).
export function drawVideoCrop(c: CanvasRenderingContext2D, video: HTMLVideoElement) {
  const vw = video.videoWidth, vh = video.videoHeight;
  const scale = Math.max(W / vw, H / vh);
  const sw = vw * scale, sh = vh * scale;
  c.drawImage(video, (W - sw) / 2, (H - sh) / 2, sw, sh);
}

// Draws the watermark as a semi-transparent bar along the bottom edge.
export function drawWatermark(c: CanvasRenderingContext2D, wm: string) {
  c.save();
  const fontSize = Math.round(W / 30);
  c.font = `bold ${fontSize}px system-ui, sans-serif`;
  const pad = fontSize * 0.6;
  const barH = fontSize + pad * 2;
  c.fillStyle = "rgba(0,0,0,0.45)";
  c.fillRect(0, H - barH, W, barH);
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillStyle = "rgba(255,255,255,0.85)";
  c.fillText(wm, W / 2, H - barH / 2);
  c.restore();
}

// Encodes composited pixels into a PNG data URL for saving / previewing.
export function frameToDataUrl(imageData: ImageData): string {
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  c.getContext("2d")!.putImageData(imageData, 0, 0);
  return c.toDataURL("image/png");
}

// Builds a 2x2 photo strip from up to 4 frames, each halved into a quadrant.
export function createStrip(frames: ImageData[]): string {
  const gap = 2, cw = W / 2, ch = H / 2;
  const c = document.createElement("canvas");
  c.width = W; c.height = H;
  const sCtx = c.getContext("2d")!;
  sCtx.fillStyle = "#000";
  sCtx.fillRect(0, 0, W, H);
  const positions = [[0, 0], [cw + gap, 0], [0, ch + gap], [cw + gap, ch + gap]];
  frames.forEach((imageData, i) => {
    const pos = positions[i];
    if (!pos) return;
    const tmp = document.createElement("canvas");
    tmp.width = W; tmp.height = H;
    tmp.getContext("2d")!.putImageData(imageData, 0, 0);
    sCtx.drawImage(tmp, pos[0], pos[1], cw, ch);
  });
  return c.toDataURL("image/png");
}
