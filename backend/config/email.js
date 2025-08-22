const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST,
  port: parseInt(process.env.BREVO_SMTP_PORT, 10),
  secure: false, // TLS (must be false for port 587)
  auth: {
    user: process.env.BREVO_SMTP_USER,  // SMTP login email
    pass: process.env.BREVO_SMTP_PASS,  // SMTP key/password
  },
});

transporter.verify(function (error, success) {
  if (error) {
    console.error("[email.js] SMTP verification failed:", error);
  } else {
    console.log("[email.js] SMTP server is ready to send messages");
  }
});

module.exports = transporter;
