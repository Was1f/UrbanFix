// backend/config/email.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host: process.env.BREVO_SMTP_HOST || 'smtp-relay.brevo.com',
  port: Number(process.env.BREVO_SMTP_PORT) || 587,
  secure: false, // true if you use 465
  auth: {
    user: process.env.BREVO_SMTP_USER || 'apikey', // literally "apikey"
    pass: process.env.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,              // your Brevo API key
  },
});

module.exports = transporter;
