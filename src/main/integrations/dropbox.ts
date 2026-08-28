// Dropbox integration: uploads photos to /Apps/<app>/<folder> and creates a
// shared link (read-only) for the QR code. OAuth token from the shared flow.
import { getAccessToken } from "./oauth";
import { DropboxConfig } from "./types";

export async function upload(
  cfg: DropboxConfig,
  filename: string,
  buffer: Uint8Array,
  contentType = "image/png",
): Promise<{ url: string }> {
  if (!cfg.clientId) throw new Error("Dropbox: missing app key");
  if (!cfg.tokens) throw new Error("Dropbox: not authorized - click Authorize");
  const token = await getAccessToken("dropbox", cfg, cfg.tokens);

  const folder = (cfg.folder || "").replace(/^\/+|\/+$/g, "");
  // The upload path is relative to the app folder (apps cwd is /Apps/<app>).
  const path = `/${folder ? folder + "/" : ""}${filename}`;

  const upload = await fetch("https://content.dropboxapi.com/2/files/upload", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/octet-stream",
      "Dropbox-API-Arg": JSON.stringify({
        path,
        mode: "add",
        autorename: true,
        mute: true,
        strict_conflict: false,
      }),
    },
    body: Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength),
  });
  if (!upload.ok) {
    const txt = await upload.text().catch(() => "");
    throw new Error(`Dropbox upload failed (${upload.status}): ${txt.slice(0, 200)}`);
  }
  const meta = (await upload.json()) as { id?: string; path_display?: string };

  // Create a read-only shared link for the uploaded file.
  const share = await fetch("https://api.dropboxapi.com/2/sharing/create_shared_link_with_settings", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      path: meta.path_display || path,
      settings: { requested_visibility: "public", access: "viewer" },
    }),
  });
  if (share.ok) {
    const s = (await share.json()) as { url?: string };
    if (s.url) return { url: s.url };
  }
  // If a link already exists, fall back to listing links for the file.
  const links = await fetch("https://api.dropboxapi.com/2/sharing/list_shared_links", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ path: meta.path_display || path, direct_only: false }),
  });
  const ls = (await links.json()) as { links?: { url?: string }[] };
  const url = ls.links && ls.links[0] && ls.links[0].url;
  if (url) return { url };
  throw new Error("Dropbox: could not create a shared link");
}
