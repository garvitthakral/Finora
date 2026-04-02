import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT),
  secure: false, // true if port 465
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

// verify connection on startup
export const verifyMailer = async () => {
  try {
    await transporter.verify();
    console.log("Mail server is ready");
  } catch (err) {
    console.error("Mail server connection failed:", err);
  }
};

export default transporter;
