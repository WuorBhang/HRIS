/**
 * API function for user management, employee document upload notifications,
 * and SendGrid email dispatch.
 */
/* eslint-env node */

const {setGlobalOptions} = require("firebase-functions");
const {onRequest} = require("firebase-functions/https");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const sgMail = require("@sendgrid/mail");

admin.initializeApp();
setGlobalOptions({ maxInstances: 10 });

const ADMIN_SECRET = process.env.ADMIN_SECRET || "hris-internal-2026";
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY;
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL;

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
} else {
  logger.warn("SENDGRID_API_KEY is not configured");
}

function randomPassword(length = 12) {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

async function sendEmail({ to, subject, text, html }) {
  if (!SENDGRID_API_KEY || !SENDGRID_FROM_EMAIL) {
    throw new Error("SendGrid environment variables not set");
  }

  await sgMail.send({
    to,
    from: SENDGRID_FROM_EMAIL,
    subject,
    text,
    html,
  });
}

async function handleCreateEmployer(req, res) {
  const { email, displayName, role = "employer" } = req.body || {};

  if (!email) return res.status(400).json({ error: "Email is required" });
  if (!["employer", "it-expert", "user", "admin"].includes(role)) {
    return res.status(400).json({ error: "Invalid role" });
  }

  const tempPassword = randomPassword();

  try {
    const userRecord = await admin.auth().createUser({
      email,
      password: tempPassword,
      displayName,
    });

    await admin.auth().setCustomUserClaims(userRecord.uid, { role });

    let emailSent = false;
    let emailError = null;

    try {
      await sendEmail({
        to: email,
        subject: "Your HRIS employer account is ready",
        text: `Hello ${displayName || "Employer"},\n\nYour employer account has been created.\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and change your password immediately.`,
        html: `<p>Hello ${displayName || "Employer"},</p><p>Your employer account has been created.</p><ul><li>Email: ${email}</li><li>Password: ${tempPassword}</li></ul><p>Please log in and change your password immediately.</p>`,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message || "SendGrid error";
      logger.error("SendGrid create-employer error", err);
    }

    return res.status(200).json({ uid: userRecord.uid, tempPassword, emailSent, emailError });
  } catch (error) {
    logger.error("create-employer error", error);
    return res.status(500).json({ error: error.message });
  }
}

async function handleResetCredentials(req, res) {
  const { email, displayName, role } = req.body || {};

  if (!email) return res.status(400).json({ error: "Email is required" });

  let userRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error) {
    return res.status(404).json({ error: "User not found" });
  }

  const tempPassword = randomPassword();

  try {
    const updates = { password: tempPassword };
    if (displayName) updates.displayName = displayName;

    await admin.auth().updateUser(userRecord.uid, updates);

    if (role && ["employer", "it-expert", "user", "admin"].includes(role)) {
      await admin.auth().setCustomUserClaims(userRecord.uid, { role });
    }

    let emailSent = false;
    let emailError = null;

    try {
      await sendEmail({
        to: email,
        subject: "Your HRIS credentials were reset",
        text: `Hello ${displayName || userRecord.displayName || "User"},\n\nYour credentials were reset.\nEmail: ${email}\nPassword: ${tempPassword}\n\nPlease log in and change your password immediately.`,
        html: `<p>Hello ${displayName || userRecord.displayName || "User"},</p><p>Your credentials were reset.</p><ul><li>Email: ${email}</li><li>Password: ${tempPassword}</li></ul><p>Please log in and change your password immediately.</p>`,
      });
      emailSent = true;
    } catch (err) {
      emailError = err.message || "SendGrid error";
      logger.error("SendGrid reset-credentials error", err);
    }

    return res.status(200).json({ tempPassword, emailSent, emailError });
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
}

async function handleNotifyDocument(req, res) {
  const { to, employeeFullName, fileName, uploadedAt, downloadUrl } = req.body || {};

  if (!to || !employeeFullName || !fileName) {
    return res.status(400).json({ error: "Missing required fields" });
  }

  try {
    await sendEmail({
      to,
      subject: `New PDF document for ${employeeFullName}`,
      text: `A document has been uploaded for ${employeeFullName}.\nFile: ${fileName}\nUploaded: ${uploadedAt || new Date().toLocaleString()}\n${downloadUrl ? `Download link: ${downloadUrl}` : ""}`,
      html: `<p>A document has been uploaded for <strong>${employeeFullName}</strong>.</p><p><strong>File:</strong> ${fileName}</p><p><strong>Uploaded:</strong> ${uploadedAt || new Date().toLocaleString()}</p>${downloadUrl ? `<p><a href="${downloadUrl}">Download file</a></p>` : ""}`,
    });
    return res.status(200).json({ success: true });
  } catch (error) {
    logger.error("notify-document error", error);
    return res.status(500).json({ success: false, emailError: error.message });
  }
}

exports.api = onRequest(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
    res.set("Access-Control-Allow-Headers", "Content-Type,x-admin-secret");
    return res.status(200).send("ok");
  }

  const secret = req.header("x-admin-secret");
  if (secret !== ADMIN_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }

  const path = req.path || "";

  if (path === "/admin/create-employer" && req.method === "POST") {
    return handleCreateEmployer(req, res);
  }

  if (path === "/admin/reset-credentials" && req.method === "POST") {
    return handleResetCredentials(req, res);
  }

  if (path === "/admin/notify-document" && req.method === "POST") {
    return handleNotifyDocument(req, res);
  }

  return res.status(404).json({ error: "Not found" });
});
