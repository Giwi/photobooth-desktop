// Google Drive integration: uploads photos to a folder via the Drive v3 media
// upload API, using an OAuth-token obtained through the shared flow. Returns a
// shareable link for the QR code.
import { getAccessToken } from "./oauth";
import { GoogleDriveConfig } from "./types";

export async function upload(
  cfg: GoogleDriveConfig,
  filename: string,
  buffer: Uint8Array,
  contentType = "image/png",
): Promise<{ url: string }> {
  if (!cfg.clientId) throw new Error("Google Drive: missing client ID");
  if (!cfg.tokens) throw new Error("Google Drive: not authorized - click Authorize");
  const token = await getAccessToken("googledrive", cfg, cfg.tokens);

  // Find (or create) the target folder by name under the app's space.
  const folderId = await findOrCreateFolder(token, cfg.folder || "Photobooth");

  // Multipart upload: JSON metadata + binary media.
  const boundary = `pb${Math.random().toString(16).slice(2)}`;
  const meta = JSON.stringify({
    name: filename,
    parents: [folderId],
  });
  const head = Buffer.from(
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${meta}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
  );
  const tail = Buffer.from(`\r\n--${boundary}--\r\n`);
  const body = Buffer.concat([head, Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength), tail]);

  const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": `multipart/related; boundary=${boundary}`,
      "Content-Length": String(body.byteLength),
    },
    body,
  });
  if (!res.ok) throw new Error(`Google Drive upload failed (${res.status})`);
  const file = (await res.json()) as { id?: string };
  if (!file.id) throw new Error("Google Drive: no file id");

  // Make the file readable by anyone with the link.
  await fetch(`https://www.googleapis.com/drive/v3/files/${file.id}/permissions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ role: "reader", type: "anyone" }),
  });

  return { url: `https://drive.google.com/file/d/${file.id}/view` };
}

async function findOrCreateFolder(token: string, name: string): Promise<string> {
  const q = encodeURIComponent(`name='${name}' and mimeType='application/vnd.google-apps.folder' and trashed=false`);
  const search = await fetch(`https://www.googleapis.com/drive/v3/files?q=${q}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const list = (await search.json()) as { files?: { id: string }[] };
  if (list.files && list.files.length > 0) return list.files[0].id;
  const create = await fetch("https://www.googleapis.com/drive/v3/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ name, mimeType: "application/vnd.google-apps.folder" }),
  });
  const dir = (await create.json()) as { id?: string };
  if (!dir.id) throw new Error("Google Drive: folder creation failed");
  return dir.id;
}
