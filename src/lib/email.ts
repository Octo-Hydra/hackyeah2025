interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/**
 * MVP Email Simulation - No actual email is sent
 * For production, integrate a real email service
 */
export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  // Simulate email sending for MVP
  console.log("=== SIMULATED EMAIL ===");
  console.log("To:", to);
  console.log("Subject:", subject);
  console.log("Text:", text);
  console.log("======================");

  // Always return success for MVP
  return { 
    success: true, 
    data: { 
      message: "Email simulation - no actual email sent",
      simulated: true 
    } 
  };
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  // MVP: Simulate email sending
  console.log("=== SIMULATED VERIFICATION EMAIL ===");
  console.log("Verification URL:", verificationUrl);
  console.log("====================================");

  return sendEmail({
    to: email,
    subject: "Potwierdź swój adres email - OnTime",
    text: `Potwierdź swój adres email, klikając w link: ${verificationUrl}`,
    html: `<p>Verification URL: ${verificationUrl}</p>`,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  // MVP: Simulate email sending
  console.log("=== SIMULATED PASSWORD RESET EMAIL ===");
  console.log("Reset URL:", resetUrl);
  console.log("======================================");

  return sendEmail({
    to: email,
    subject: "Resetowanie hasła - OnTime",
    text: `Zresetuj swoje hasło, klikając w link: ${resetUrl}`,
    html: `<p>Reset URL: ${resetUrl}</p>`,
  });
}
