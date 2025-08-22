const transporter = require("./config/email");
require("dotenv").config();

async function sendTestMail() {
  try {
    let info = await transporter.sendMail({
      from: process.env.MAIL_FROM,       // verified sender
      to: "shadmanshafin49@gmail.com",   // test receiver
      subject: "UrbanFix OTP Test",
      text: "This is a test email from Brevo setup.",
    });

    console.log("Message sent:", info.messageId);
  } catch (err) {
    console.error("Error sending email:", err);
  }
}

sendTestMail();
