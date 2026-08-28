// Nextcloud integration: uploads photos over WebDAV, then creates a public
// share link (OCS Share API) whose URL the renderer shows as a QR code so a
// phone can download the photo without logging in.
import { NextcloudConfig } from "./types";

// WebDAV-ish helpers using Node's fetch (bundled Electron-node has global fetch).
const DAV = "/remote.php/dav";
const OCS = "/ocs/v1.php/apps/files_sharing/api/v1/shares";
const USER_AGENT = "Photobooth-Desktop/0.0.6";

function davFolder(cfg: NextcloudConfig) {
  // Drop into the user's home under the configured subfolder (default
  // "Photobooth"). Nested subfolder paths are created on first upload.
  const folder = (cfg.folder || "Photobooth").split("/").filter(Boolean).join("/");
  return `${DAV}/files/${encodeURIComponent(cfg.username)}/${folder}`;
}

async function ensureFolder(cfg: NextcloudConfig) {
  // MKCOL only creates one level; walk the subfolder path creating each level.
  const base = cfg.baseUrl.replace(/\/$/, "");
  const parts = (cfg.folder || "Photobooth").split("/").filter(Boolean);
  let path = `${DAV}/files/${encodeURIComponent(cfg.username)}`;
  for (const part of parts) {
    path += `/${encodeURIComponent(part)}`;
    const res = await fetch(`${base}${path}/`, {
      method: "MKCOL",
      headers: {
        Authorization: basicAuth(cfg),
        "User-Agent": USER_AGENT,
      },
    });
    // 405 = already exists; 201 = created. Anything else is an error.
    if (res.status !== 201 && res.status !== 405) return false;
  }
  return true;
}

function basicAuth(cfg: NextcloudConfig) {
  return "Basic " + Buffer.from(`${cfg.username}:${cfg.password}`).toString("base64");
}

function sharePath(cfg: NextcloudConfig) {
  // Nextcloud OCS share API paths are relative to the user's home, so reuse
  // the same configured subfolder.
  return `/${(cfg.folder || "Photobooth").split("/").filter(Boolean).join("/")}`;
}

export async function upload(
  cfg: NextcloudConfig,
  filename: string,
  buffer: Uint8Array,
  contentType = "image/png",
): Promise<{ url: string }> {
  const base = cfg.baseUrl.replace(/\/$/, "");

  if (!(await ensureFolder(cfg))) {
    throw new Error("Nextcloud folder creation failed");
  }
  const davPath = `${davFolder(cfg)}/${encodeURIComponent(filename)}`;
  const put = await fetch(`${base}${davPath}`, {
    method: "PUT",
    headers: {
      Authorization: basicAuth(cfg),
      "Content-Type": contentType,
      "User-Agent": USER_AGENT,
      "Content-Length": String(buffer.byteLength),
    },
    body: buffer,
  });
  if (!put.ok && put.status !== 201 && put.status !== 204) {
    throw new Error(`WebDAV upload failed (${put.status})`);
  }

  // Create a public share through the OCS Share API.
  const ocs = await fetch(`${base}${OCS}?format=json`, {
    method: "POST",
    headers: {
      Authorization: basicAuth(cfg),
      "User-Agent": USER_AGENT,
      "OCS-APIRequest": "true",
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      path: `${sharePath(cfg)}/${filename}`,
      shareType: "3", // public link share
      permissions: "1", // read
    }),
  });

  let shareUrl = "";
  const text = await ocs.text();
  try {
    const json = JSON.parse(text);
    const url = json?.ocs?.data?.url;
    if (typeof url === "string") shareUrl = url;
  } catch {
    /* non-JSON response */
  }

  if (!shareUrl) {
    throw new Error(`Nextcloud share creation failed (${ocs.status})`);
  }

  return { url: shareUrl };
}
