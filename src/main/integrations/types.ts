// Shared integration types. Persisted under cfg.integrations.<id>.
export interface NextcloudConfig {
  enabled: boolean;
  baseUrl: string;
  username: string;
  password: string;
  // Subfolder under the user's Nextcloud home where photos are uploaded
  // (e.g. "Photobooth"). Nested paths like "Photobooth/2026" are allowed.
  folder?: string;
}

// OAuth token set persisted in each cloud-drive integration's config.
export interface TokenResponse {
  access_token?: string;
  refresh_token?: string;
  expires_at?: number;
  token_type?: string;
}

// Shared shape for the OAuth cloud-drive integrations.
export interface CloudDriveConfig {
  enabled: boolean;
  clientId: string;
  clientSecret?: string;
  folder?: string;
  tokens?: TokenResponse;
}

export interface GoogleDriveConfig extends CloudDriveConfig {}
export interface DropboxConfig extends CloudDriveConfig {}
export interface OneDriveConfig extends CloudDriveConfig {}

export interface FtpConfig {
  enabled: boolean;
  mode: "ftp" | "sftp";
  host: string;
  port?: number;
  username: string;
  password: string;
  // Remote directory (will be created if possible); default "/".
  folder?: string;
}

export interface EmailConfig {
  enabled: boolean;
  host: string;
  port?: number;
  secure?: boolean;
  username: string;
  password: string;
  from: string;
  subject?: string;
}

export interface PrinterConfig {
  enabled: boolean;
  printer: string;
}

// Shape of the raw per-integration config from the JSON config file.
export type IntegrationConfig = {
  nextcloud?: NextcloudConfig;
  googledrive?: GoogleDriveConfig;
  dropbox?: DropboxConfig;
  onedrive?: OneDriveConfig;
  ftp?: FtpConfig;
  email?: EmailConfig;
  printer?: PrinterConfig;
};
