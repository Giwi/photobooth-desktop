// Integration registry. Each integration lives in its own file in this folder
// and exports a small adapter ({ enabled(config), upload(config, file, buffer) }).
// Register new integrations here to have them uploaded after every save.
import { IntegrationConfig } from "./types";
import * as nextcloud from "./nextcloud";
import * as googledrive from "./googledrive";
import * as dropbox from "./dropbox";
import * as onedrive from "./onedrive";
import * as ftp from "./ftp";
import * as email from "./email";
import * as printer from "./printer";
import { authorize } from "./oauth";
import { OAuthClientConfig } from "./oauth";

export type UploadResult = { url: string };

interface IntegrationAdapter {
  id: string;
  upload: (
    cfg: any,
    filename: string,
    buffer: Uint8Array,
    contentType?: string,
  ) => Promise<UploadResult>;
}

// Push-to-cloud adapters (run after every save and can produce a share URL for
// the QR code). Email and printer are separate (see below).
const ADAPTERS: IntegrationAdapter[] = [
  { id: "nextcloud", upload: nextcloud.upload },
  { id: "googledrive", upload: googledrive.upload },
  { id: "dropbox", upload: dropbox.upload },
  { id: "onedrive", upload: onedrive.upload },
  { id: "ftp", upload: ftp.upload },
];

export function isEnabled(cfg: IntegrationConfig, id: string): boolean {
  return Boolean((cfg as Record<string, any>)[id]?.enabled);
}

// Uploads `buffer` to every enabled integration. Returns map of id -> share
// URL for those that succeeded (used for the QR code). Silently skips failed
// integrations but reports them so the caller can log.
export async function uploadToAll(
  cfg: IntegrationConfig,
  filename: string,
  buffer: Uint8Array,
  contentType?: string,
): Promise<{ urls: Record<string, string>; errors: Record<string, string> }> {
  const urls: Record<string, string> = {};
  const errors: Record<string, string> = {};
  for (const adapter of ADAPTERS) {
    const raw = (cfg as Record<string, any>)[adapter.id];
    if (!raw?.enabled) continue;
    try {
      const { url } = await adapter.upload(raw, filename, buffer, contentType);
      urls[adapter.id] = url;
    } catch (err) {
      errors[adapter.id] = (err as Error).message;
      console.error(`[integration:${adapter.id}] upload failed:`, (err as Error).message);
    }
  }
  return { urls, errors };
}

// OAuth authorization for the cloud-drive integrations. Returns the tokens to
// persist (renderer writes them into the config and saves to disk).
export function authorizeOAuth(id: string, clientCfg: OAuthClientConfig) {
  return authorize(id, clientCfg);
}

export { email, printer };
export { listPrinters } from "./printer";
