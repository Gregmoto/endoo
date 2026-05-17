export function emailShell(title: string, preheader: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="sv">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${title}</title>
</head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;color:#111827">
  <!-- preheader (hidden) -->
  <span style="display:none;max-height:0;overflow:hidden">${preheader}</span>
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,.08)">
        <!-- Header -->
        <tr>
          <td style="background:#4f46e5;padding:24px 32px">
            <p style="margin:0;font-size:20px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">Endoo</p>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:32px">
            ${bodyHtml}
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:1px solid #f0f0f0">
            <p style="margin:0;font-size:11px;color:#9ca3af;text-align:center">
              Du får det här mejlet eftersom du är administratör i din organisation i Endoo.
              Hantera dina notifikationsinställningar i <a href="https://app.endoo.se/settings/notifications" style="color:#6366f1">Endoo-inställningar</a>.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function h1(text: string): string {
  return `<h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#111827;letter-spacing:-0.3px">${text}</h1>`
}

export function p(text: string): string {
  return `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:#374151">${text}</p>`
}

export function factRow(label: string, value: string): string {
  return `
    <tr>
      <td style="padding:8px 0;font-size:13px;color:#6b7280;white-space:nowrap;padding-right:24px">${label}</td>
      <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:500">${value}</td>
    </tr>`
}

export function factsTable(rows: string): string {
  return `
    <table cellpadding="0" cellspacing="0" style="width:100%;margin:16px 0 24px;border-top:1px solid #f0f0f0;border-collapse:collapse">
      ${rows}
    </table>`
}

export function ctaButton(label: string, href: string): string {
  return `
    <div style="margin:24px 0 8px">
      <a href="${href}" style="display:inline-block;background:#4f46e5;color:#ffffff;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px;text-decoration:none">${label}</a>
    </div>`
}

export function alertBox(text: string, color = "#fef3c7", borderColor = "#f59e0b"): string {
  return `<div style="background:${color};border-left:4px solid ${borderColor};padding:12px 16px;border-radius:4px;margin:0 0 20px;font-size:14px;color:#92400e">${text}</div>`
}
