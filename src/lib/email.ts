import FormData from "form-data";
import Mailgun from "mailgun.js";

const mailgun = new Mailgun(FormData);

const mg = mailgun.client({
  username: "api",
  key: process.env.MAILGUN_API_KEY!,
  url: "https://api.eu.mailgun.net",
});

const MAILGUN_DOMAIN = process.env.MAILGUN_DOMAIN!;
const FROM_EMAIL = process.env.FROM_EMAIL;

interface SendEmailOptions {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

export async function sendEmail({ to, subject, text, html }: SendEmailOptions) {
  try {
    const data = await mg.messages.create(MAILGUN_DOMAIN, {
      from: FROM_EMAIL,
      to: [to],
      subject,
      text,
      html,
    });

    console.log("Email wysłany:", data);
    return { success: true, data };
  } catch (error) {
    console.error("Błąd wysyłania emaila:", error);
    return { success: false, error };
  }
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `${process.env.NEXTAUTH_URL}/auth/verify-email?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>OnTime</h1>
          </div>
          <div class="content">
            <h2>Potwierdź swój adres email</h2>
            <p>Dziękujemy za rejestrację w OnTime! Aby dokończyć proces rejestracji, kliknij poniższy przycisk:</p>
            <center>
              <a href="${verificationUrl}" class="button">Potwierdź adres email</a>
            </center>
            <p>Jeśli przycisk nie działa, skopiuj i wklej poniższy link w przeglądarce:</p>
            <p style="word-break: break-all; color: #2563eb;">${verificationUrl}</p>
            <p>Ten link wygaśnie za 24 godziny.</p>
            <p>Jeśli nie zakładałeś konta w OnTime, zignoruj tę wiadomość.</p>
          </div>
          <div class="footer">
            <p>© 2025 OnTime. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Potwierdź swój adres email - OnTime",
    text: `Potwierdź swój adres email, klikając w link: ${verificationUrl}`,
    html,
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const resetUrl = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token}`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
          .content { background-color: #f9fafb; padding: 30px; border-radius: 0 0 5px 5px; }
          .button { display: inline-block; padding: 12px 30px; background-color: #2563eb; color: white; text-decoration: none; border-radius: 5px; margin: 20px 0; }
          .footer { text-align: center; margin-top: 20px; color: #6b7280; font-size: 12px; }
          .warning { background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>OnTime</h1>
          </div>
          <div class="content">
            <h2>Resetowanie hasła</h2>
            <p>Otrzymaliśmy prośbę o zresetowanie hasła do Twojego konta OnTime.</p>
            <p>Kliknij poniższy przycisk, aby ustawić nowe hasło:</p>
            <center>
              <a href="${resetUrl}" class="button">Resetuj hasło</a>
            </center>
            <p>Jeśli przycisk nie działa, skopiuj i wklej poniższy link w przeglądarce:</p>
            <p style="word-break: break-all; color: #2563eb;">${resetUrl}</p>
            <div class="warning">
              <strong>⚠️ Uwaga:</strong> Ten link wygaśnie za 1 godzinę.
            </div>
            <p>Jeśli nie prosiłeś o resetowanie hasła, zignoruj tę wiadomość - Twoje hasło pozostanie bez zmian.</p>
          </div>
          <div class="footer">
            <p>© 2025 OnTime. Wszystkie prawa zastrzeżone.</p>
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail({
    to: email,
    subject: "Resetowanie hasła - OnTime",
    text: `Zresetuj swoje hasło, klikając w link: ${resetUrl}`,
    html,
  });
}
