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

// Shape of the raw per-integration config from the JSON config file.
export type IntegrationConfig = {
  nextcloud?: NextcloudConfig;
};
