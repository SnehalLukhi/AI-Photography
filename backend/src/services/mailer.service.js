const nodemailer = require('nodemailer')
const env = require('../config/env')

/** Sends e-mail through the SMTP server from .env (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM). */
const isConfigured = () => !!(env.smtp.host && env.smtp.user && env.smtp.password && env.smtp.from)

let transport
const smtp = () => (transport ||= nodemailer.createTransport({
  host: env.smtp.host,
  port: env.smtp.port,
  secure: env.smtp.port === 465, // 465 = TLS from the start, 587 = STARTTLS
  auth: { user: env.smtp.user, pass: env.smtp.password },
}))

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

/** The e-mail with the password reset link. Plain text + HTML in the app's dark purple look. */
async function sendPasswordReset(to, link, minutes) {
  const text = `Reset your password\n\nSomeone asked to reset the password of your account. Open this link to choose a new one (valid for ${minutes} minutes):\n\n${link}\n\nIf this wasn't you, ignore this e-mail: your password stays the same.`
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#000000;font-family:Arial,Helvetica,sans-serif;color:#ffffff">
  <div style="max-width:480px;margin:0 auto;background:linear-gradient(135deg,#2A1B52,#1A284F);border:1px solid #3A3552;border-radius:16px;padding:32px">
    <h1 style="margin:0 0 12px;font-size:24px;color:#ffffff">Reset your password</h1>
    <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#C4B5FD">Someone asked to reset the password of your account. Click the button to choose a new one. The link is valid for ${esc(minutes)} minutes.</p>
    <p style="margin:0 0 24px"><a href="${esc(link)}" style="display:inline-block;padding:14px 28px;border-radius:12px;background:#B070FA;background-image:linear-gradient(90deg,#B070FA,#F066D8);color:#ffffff;text-decoration:none;font-weight:bold;font-size:15px">Reset password</a></p>
    <p style="margin:0 0 8px;font-size:12px;line-height:1.6;color:#C4B5FD">Button not working? Copy this link into your browser:</p>
    <p style="margin:0 0 24px;font-size:12px;word-break:break-all;color:#ffffff">${esc(link)}</p>
    <p style="margin:0;font-size:12px;line-height:1.6;color:#C4B5FD">If this wasn't you, ignore this e-mail: your password stays the same.</p>
  </div></body></html>`
  await smtp().sendMail({ from: env.smtp.from, to, subject: 'Reset your password', text, html })
}

module.exports = { isConfigured, sendPasswordReset }
