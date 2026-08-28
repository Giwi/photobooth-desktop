// Email integration: sends the captured photo to a guest-provided address over
// SMTP using nodemailer. Unlike the push-to-cloud integrations this is not part
// of `uploadToAll`; it is triggered from the preview screen when the guest types
// their email, and returns no share URL (no QR).
import nodemailer from "nodemailer";
import { EmailConfig } from "./types";

export async function send(
  cfg: EmailConfig,
  to: string,
  filename: string,
  buffer: Uint8Array,
  contentType = "image/png",
): Promise<void> {
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port || 587,
    secure: cfg.secure ?? false,
    auth: cfg.username ? { user: cfg.username, pass: cfg.password } : undefined,
  });

  const ext = filename.split(".").pop() || "png";
  await transporter.sendMail({
    from: cfg.from || cfg.username,
    to,
    subject: cfg.subject || "Your photo",
    text: "Here is your photo from the photobooth.",
    attachments: [
      {
        filename,
        content: Buffer.from(buffer.buffer, buffer.byteOffset, buffer.byteLength),
        contentType,
      },
    ],
  });
  console.log(`[integration:email] sent ${filename} to ${to}`);
}
