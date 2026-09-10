import { emailTemplates } from "../supabase/email-templates/templates.mjs";

const required = ["SUPABASE_URL", "SUPABASE_ACCESS_TOKEN", "RESEND_API_KEY", "AUTH_EMAIL_FROM"];
const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Missing server-only configuration: ${missing.join(", ")}`);
  process.exit(1);
}

const supabaseUrl = new URL(process.env.SUPABASE_URL);
const projectRef = supabaseUrl.hostname.split(".")[0];
if (!/^[a-z0-9]{20}$/.test(projectRef)) {
  console.error("SUPABASE_URL does not contain a valid hosted Supabase project reference.");
  process.exit(1);
}

const sender = process.env.AUTH_EMAIL_FROM.trim().toLowerCase();
const senderDomain = sender.split("@")[1] ?? "";
const mailboxDomains = new Set(["gmail.com", "outlook.com", "hotmail.com", "yahoo.com", "icloud.com", "resend.dev"]);
if (!senderDomain || mailboxDomains.has(senderDomain)) {
  console.error("AUTH_EMAIL_FROM must use a domain you verified in Resend (for example, no-reply@auth.yourdomain.com).");
  process.exit(1);
}

const payload = {
  external_email_enabled: true,
  mailer_autoconfirm: false,
  smtp_admin_email: sender,
  smtp_sender_name: process.env.AUTH_EMAIL_SENDER_NAME?.trim() || "Wellfarm",
  smtp_host: "smtp.resend.com",
  smtp_port: 465,
  smtp_user: "resend",
  smtp_pass: process.env.RESEND_API_KEY,
  mailer_subjects_confirmation: emailTemplates.confirmation.subject,
  mailer_templates_confirmation_content: emailTemplates.confirmation.html,
  mailer_subjects_recovery: emailTemplates.recovery.subject,
  mailer_templates_recovery_content: emailTemplates.recovery.html,
  mailer_subjects_magic_link: emailTemplates.magic_link.subject,
  mailer_templates_magic_link_content: emailTemplates.magic_link.html,
  mailer_subjects_invite: emailTemplates.invite.subject,
  mailer_templates_invite_content: emailTemplates.invite.html,
  mailer_subjects_email_change: emailTemplates.email_change.subject,
  mailer_templates_email_change_content: emailTemplates.email_change.html,
  mailer_subjects_reauthentication: emailTemplates.reauthentication.subject,
  mailer_templates_reauthentication_content: emailTemplates.reauthentication.html,
};

const response = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/config/auth`, {
  method: "PATCH",
  headers: {
    Authorization: `Bearer ${process.env.SUPABASE_ACCESS_TOKEN}`,
    "Content-Type": "application/json",
  },
  body: JSON.stringify(payload),
});

if (!response.ok) {
  const message = await response.text();
  console.error(`Supabase email configuration failed (${response.status}): ${message.slice(0, 500)}`);
  process.exit(1);
}

console.log(`Wellfarm Auth email templates and Resend SMTP configured for ${projectRef}.`);
console.log(`Sender: ${sender}`);
console.log("Next: send a fresh signup OTP to Gmail and inspect delivery in Resend.");
