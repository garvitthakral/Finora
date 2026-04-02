import "dotenv/config";
import transporter from "../../config/mailer.js";

export const sendWelcomeEmail = async (
  email: string,
  fullName: string,
  role: string,
): Promise<boolean> => {
  try {
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: email,
      subject: "Welcome to Finora",
      text: `Hello ${fullName},

Welcome to Finora!

Your account has been successfully created with the role: ${role}.

You can now start tracking your finances, managing transactions, and viewing insights about your income and expenses.

If you did not create this account, please contact support immediately.

Best regards,
Finora Team
`,
    });

    if (!info.accepted.includes(email)) {
      return false;
    }

    return true;
  } catch (error) {
    console.error("Failed to send welcome email:", error);

    return false;
  }
};
