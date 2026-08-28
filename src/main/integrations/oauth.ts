// Shared OAuth2 authorization-code + PKCE + refresh helper for the cloud-drive
// integrations. Uses oauth4webapi (no deps) + Electron shell + a local redirect
// server, so the user authorizes in their browser and the tokens are stored in
// the per-provider config.
//
// Each provider supplies its own metadata below. The redirect URI must be
// registered in the provider's app console; it is fixed so it only needs to be
// set up once.
import * as oauth from "oauth4webapi";
import { createServer } from "http";
import { randomBytes } from "crypto";
import { shell } from "electron";
import type { TokenResponse } from "./types";

export const REDIRECT_PORT = 5756;
export const REDIRECT_URI = `http://127.0.0.1:${REDIRECT_PORT}/callback`;

export interface ProviderMetadata {
  id: string;
  label: string;
  authorization_endpoint: string;
  token_endpoint: string;
  issuer?: string;
  scopes: string;
  // auth via ClientSecretPost for confidential clients (Dropbox), else PKCE only
  useClientSecret?: boolean;
}

const PROVIDERS: Record<string, ProviderMetadata> = {
  googledrive: {
    id: "googledrive",
    label: "Google Drive",
    authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    token_endpoint: "https://oauth2.googleapis.com/token",
    issuer: "https://accounts.google.com",
    scopes: "https://www.googleapis.com/auth/drive.file",
  },
  dropbox: {
    id: "dropbox",
    label: "Dropbox",
    authorization_endpoint: "https://www.dropbox.com/oauth2/authorize",
    token_endpoint: "https://api.dropboxapi.com/oauth2/token",
    scopes: "files.content.write",
  },
  onedrive: {
    id: "onedrive",
    label: "OneDrive",
    authorization_endpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/authorize",
    token_endpoint: "https://login.microsoftonline.com/common/oauth2/v2.0/token",
    issuer: "https://login.microsoftonline.com/common/v2.0",
    scopes: "files.readwrite offline_access",
  },
};

export function providerMeta(id: string): ProviderMetadata | undefined {
  return PROVIDERS[id];
}

// Shape passed from the renderer when the user clicks "Authorize".
export interface OAuthClientConfig {
  clientId: string;
  clientSecret?: string;
}

function clientFor(meta: ProviderMetadata, cfg: OAuthClientConfig): oauth.Client {
  const client: oauth.Client = {
    client_id: cfg.clientId,
  };
  if (meta.useClientSecret && cfg.clientSecret) {
    client.client_secret = cfg.clientSecret;
  }
  return client;
}

function asFor(meta: ProviderMetadata): oauth.AuthorizationServer {
  const as: oauth.AuthorizationServer = {
    issuer: meta.issuer || meta.label,
    authorization_endpoint: meta.authorization_endpoint,
    token_endpoint: meta.token_endpoint,
  };
  return as;
}

// Open the provider's authorization page in the browser and resolve with the
// authorization code (or throw on error). A local server captures the redirect.
function collectAuthorizationCode(
  meta: ProviderMetadata,
  client: oauth.Client,
  codeVerifier: string,
  state: string,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const server = createServer((req, res) => {
      const url = new URL(req.url || "/", `http://127.0.0.1:${REDIRECT_PORT}`);
      if (url.pathname !== "/callback") {
        res.writeHead(404).end();
        return;
      }
      const params = url.searchParams;
      const error = params.get("error");
      if (error) {
        res.writeHead(302, { Location: "http://127.0.0.1:0/error" }).end();
        server.close();
        reject(new Error(`OAuth error: ${error}: ${params.get("error_description") || ""}`));
        return;
      }
      const code = params.get("code");
      const gotState = params.get("state");
      // Close the browser tab by navigating to a page that self-closes if possible.
      res
        .setHeader("Content-Type", "text/html")
        .end("<!doctype html><body><script>close();</script><p>You can close this tab.</p>");
      server.close();
      if (!code || gotState !== state) {
        reject(new Error("OAuth: missing or mismatched code/state"));
        return;
      }
      resolve(code);
    });
    server.on("error", (err) => reject(err));
    server.listen(REDIRECT_PORT, "127.0.0.1", () => {
      const as = asFor(meta);
      const codeChallenge = oauth.calculatePKCECodeChallenge(codeVerifier);
      codeChallenge.then((challenge) => {
        const authUrl = new URL(meta.authorization_endpoint);
        authUrl.searchParams.set("client_id", client.client_id);
        authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
        authUrl.searchParams.set("response_type", "code");
        authUrl.searchParams.set("scope", meta.scopes);
        authUrl.searchParams.set("state", state);
        authUrl.searchParams.set("code_challenge", challenge);
        authUrl.searchParams.set("code_challenge_method", "S256");
        // OneDrive access_type / prompt not needed for MSAL v2.0.
        if (meta.id === "googledrive") {
          authUrl.searchParams.set("access_type", "offline");
          authUrl.searchParams.set("prompt", "consent");
        }
        shell.openExternal(authUrl.toString());
      });
    });
  });
}

// Runs the full flow and returns the tokens (the caller persists them into the
// per-provider config). Returns { ok } with tokens, or { ok:false, error }.
export async function authorize(
  id: string,
  cfg: OAuthClientConfig,
): Promise<{ ok: boolean; error?: string; label: string; tokens?: TokenResponse }> {
  const meta = PROVIDERS[id];
  if (!meta) return { ok: false, error: "Unknown provider", label: id };
  if (!cfg.clientId) return { ok: false, error: "Missing client ID", label: meta.label };

  const client = clientFor(meta, cfg);
  const codeVerifier = oauth.generateRandomCodeVerifier();
  const state = oauth.generateRandomState();

  try {
    const code = await collectAuthorizationCode(meta, client, codeVerifier, state);
    const as = asFor(meta);
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    const response = await oauth.authorizationCodeGrantRequest(
      as,
      client,
      oauth.ClientSecretPost,
      params,
      REDIRECT_URI,
      codeVerifier,
    );
    const tokens = await oauth.processAuthorizationCodeResponse(as, client, response);
    const out: TokenResponse = {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_at: tokens.expires_in ? Date.now() + tokens.expires_in * 1000 : undefined,
      token_type: tokens.token_type,
    };
    return { ok: true, label: meta.label, tokens: out };
  } catch (err) {
    return { ok: false, error: (err as Error).message, label: meta.label };
  }
}

// Returns a valid access token for `cfg`, refreshing when near expiry. Throws if
// no token or refresh fails.
export async function getAccessToken(
  id: string,
  cfg: OAuthClientConfig,
  tokens: TokenResponse,
): Promise<string> {
  const meta = PROVIDERS[id];
  if (!meta) throw new Error("Unknown provider");
  // Fresh enough? (1 min margin)
  if (tokens.access_token && (!tokens.expires_at || tokens.expires_at > Date.now() + 60_000)) {
    return tokens.access_token;
  }
  if (!tokens.refresh_token) throw new Error("No refresh token - authorize first");
  const client = clientFor(meta, cfg);
  const as = asFor(meta);
  const response = await oauth.refreshTokenGrantRequest(
    as,
    client,
    oauth.ClientSecretPost,
    tokens.refresh_token,
  );
  const newTokens = await oauth.processRefreshTokenResponse(as, client, response);
  // oauth4webapi returns a clone; update the in-memory slot (caller persists).
  tokens.access_token = newTokens.access_token;
  tokens.token_type = newTokens.token_type;
  if (newTokens.refresh_token) tokens.refresh_token = newTokens.refresh_token;
  tokens.expires_at = newTokens.expires_in ? Date.now() + newTokens.expires_in * 1000 : undefined;
  return tokens.access_token;
}
