// FTP / SFTP integration: uploads a photo to a remote server using the system
// curl binary (handles both FTP and SFTP). Kept as an external child-process
// call, consistent with how printing shells out to `lp`.
import { spawn } from "child_process";
import { FtpConfig } from "./types";

export async function upload(
  cfg: FtpConfig,
  filename: string,
  buffer: Uint8Array,
  _contentType = "image/png",
): Promise<{ url: string }> {
  const host = cfg.host.trim();
  if (!host) throw new Error("FTP/SFTP: missing host");
  const port = cfg.port || (cfg.mode === "sftp" ? 22 : 21);
  const folder = (cfg.folder || "").replace(/^\/|\/$/g, "");
  const remotePath = `/${folder ? folder + "/" : ""}${filename}`.replace(/\/+/g, "/");

  const scheme = cfg.mode === "sftp" ? "sftp" : "ftp";
  const url = `${scheme}://${encodeURIComponent(cfg.username)}:${encodeURIComponent(cfg.password)}@${host}:${port}${remotePath}`;
  const args = ["-sS", "--upload-file", "-", url, "--create-dirs"];

  const code = await runCurl(args, buffer);
  if (code !== 0) throw new Error(`FTP/SFTP upload failed (curl exit ${code})`);
  // No public URL for an FTP/SFTP share - the photo is available on the server.
  return { url: "" };
}

function runCurl(args: string[], buffer: Uint8Array): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn("curl", args, { stdio: ["pipe", "ignore", "pipe"] });
    child.stdin.write(Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength));
    child.stdin.end();
    let err = "";
    child.stderr.on("data", (d) => (err += d.toString()));
    child.on("error", (e) => resolve(-1));
    child.on("close", (code) => {
      if (code !== 0) console.error(`[integration:ftp] ${err.trim()}`);
      resolve(code ?? -1);
    });
  });
}
