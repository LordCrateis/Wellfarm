const palette = {
  ink: "#173D31",
  green: "#214E3B",
  gold: "#F0D38A",
  paper: "#F7F4ED",
  muted: "#60776E",
  line: "#DED8CB",
};

function shell({ preheader, eyebrow, heading, body, action = "" }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width,initial-scale=1">
    <meta name="color-scheme" content="light">
    <title>${heading}</title>
  </head>
  <body style="margin:0;background:${palette.paper};color:${palette.ink};font-family:Poppins,Arial,sans-serif;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="border-collapse:collapse;background:${palette.paper};">
      <tr><td align="center" style="padding:34px 16px;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;border-collapse:separate;background:#FFFFFF;border:1px solid ${palette.line};border-radius:18px;overflow:hidden;">
          <tr><td style="padding:28px 30px 22px;border-bottom:1px solid ${palette.line};">
            <table role="presentation" cellspacing="0" cellpadding="0"><tr>
              <td style="width:42px;height:42px;border-radius:12px;background:${palette.green};color:${palette.gold};font-family:Arial,sans-serif;font-size:24px;font-weight:800;text-align:center;line-height:42px;">W</td>
              <td style="padding-left:12px;color:${palette.green};font-size:22px;font-weight:700;letter-spacing:-0.4px;">Wellfarm</td>
            </tr></table>
          </td></tr>
          <tr><td style="padding:30px;">
            <p style="margin:0 0 10px;color:${palette.green};font-size:12px;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;">${eyebrow}</p>
            <h1 style="margin:0 0 16px;color:${palette.ink};font-family:Avenue,Georgia,serif;font-size:30px;line-height:1.2;font-weight:700;">${heading}</h1>
            ${body}
            ${action}
            <p style="margin:24px 0 0;color:${palette.muted};font-size:13px;line-height:1.6;">If you did not request this, you can safely ignore this email.</p>
          </td></tr>
          <tr><td style="padding:18px 30px;border-top:1px solid ${palette.line};color:${palette.muted};font-size:12px;line-height:1.5;">Sent by Wellfarm for account security. No marketing, no tracking.</td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

const paragraph = (text) => `<p style="margin:0;color:${palette.muted};font-size:16px;line-height:1.65;">${text}</p>`;
const code = `<div style="margin:24px 0;padding:19px 16px;border:1px solid ${palette.line};border-radius:12px;background:${palette.paper};color:${palette.ink};font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:30px;font-weight:700;letter-spacing:8px;text-align:center;">{{ .Token }}</div>`;
const button = (label) => `<table role="presentation" cellspacing="0" cellpadding="0" style="margin-top:24px;"><tr><td style="border-radius:10px;background:${palette.green};"><a href="{{ .ConfirmationURL }}" style="display:inline-block;padding:14px 20px;color:#FFFFFF;font-size:15px;font-weight:700;text-decoration:none;">${label}</a></td></tr></table>`;

export const emailTemplates = {
  confirmation: {
    subject: "Verify your Wellfarm email",
    html: shell({
      preheader: "Your Wellfarm verification code is {{ .Token }}.",
      eyebrow: "Email verification",
      heading: "Finish creating your account",
      body: `${paragraph("Enter this one-time code on the Wellfarm verification screen.")}${code}${paragraph("The code expires shortly and can only be used once.")}`,
    }),
  },
  recovery: {
    subject: "Reset your Wellfarm password",
    html: shell({
      preheader: "Use this secure link to reset your Wellfarm password.",
      eyebrow: "Password reset",
      heading: "Choose a new password",
      body: paragraph("We received a request to reset your Wellfarm password. Use the secure link below to continue."),
      action: button("Reset password"),
    }),
  },
  magic_link: {
    subject: "Your Wellfarm sign-in link",
    html: shell({
      preheader: "Your secure Wellfarm sign-in link is ready.",
      eyebrow: "Secure sign-in",
      heading: "Sign in to Wellfarm",
      body: paragraph("Use this single-use link to open your fieldbook."),
      action: button("Sign in securely"),
    }),
  },
  invite: {
    subject: "You have been invited to Wellfarm",
    html: shell({
      preheader: "Accept your invitation to Wellfarm.",
      eyebrow: "Account invitation",
      heading: "Your invitation is ready",
      body: paragraph("Use the secure link below to create your Wellfarm account."),
      action: button("Accept invitation"),
    }),
  },
  email_change: {
    subject: "Confirm your new Wellfarm email",
    html: shell({
      preheader: "Confirm your new email address for Wellfarm.",
      eyebrow: "Email change",
      heading: "Confirm your new email",
      body: paragraph("Use the secure link below to confirm the email-address change on your Wellfarm account."),
      action: button("Confirm new email"),
    }),
  },
  reauthentication: {
    subject: "Your Wellfarm security code",
    html: shell({
      preheader: "Your Wellfarm security code is {{ .Token }}.",
      eyebrow: "Security check",
      heading: "Verify it is you",
      body: `${paragraph("Enter this one-time code in Wellfarm to continue the sensitive action.")}${code}${paragraph("The code expires shortly and can only be used once.")}`,
    }),
  },
};
