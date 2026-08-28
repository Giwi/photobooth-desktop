// OneDrive integration: uploads photos via the Microsoft Graph API and creates
// an anonymous read link for the QR code. OAuth token from the shared flow.
import { getAccessToken } from "./oauth";
import { OneDriveConfig } from "./types";

export async function upload(
  cfg: OneDriveConfig,
  filename: string,
  buffer: Uint8Array,
  contentType = "image/png",
): Promise<{ url: string }> {
  if (!cfg.clientId) throw new Error("OneDrive: missing client ID");
  if (!cfg.tokens) throw new Error("OneDrive: not authorized - click Authorize");
  const token = await getAccessToken("onedrive", cfg, cfg.tokens);

  const folder = (cfg.folder || "").replace(/^\/+|\/+$/g, "");
  const path = folder ? `${folder}/${filename}` : filename;
  const esc = path.split("/").map(encodeURIComponent).join("/");

  // PUT creates or replaces; OneDrive keeps permissions, so also create a
  // share link below.
  const put = await fetch(`https://graph.microsoft.com/v1.0/me/drive/root:/${esc}:/content`, {
    method: "PUT",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": contentType,
    },
    body: Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength),
  });
  if (!put.ok) {
    const txt = await put.text().catch(() => "");
    throw new Error(`OneDrive upload failed (${put.status}): ${txt.slice(0, 200)}`);
  }
  const item = (await put.json()) as { id?: string };
  if (!item.id) throw new Error("OneDrive: no item id");

  const share = await fetch(`https://graph.microsoft.com/v1.0/me/drive/items/${item.id}/createLink`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ type: "view", scope: "anonymous" }),
  });
  if (!share.ok) throw new Error(`OneDrive: share link failed (${share.status})`);
  const s = (await share.json()) as { link?: { webUrl?: string } };
  const url = s.link && s.link.webUrl;
  if (!url) throw new Error("OneDrive: no share url");
  return { url };
}
