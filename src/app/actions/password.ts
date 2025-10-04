"use server";

import { z } from "zod";
import bcrypt from "bcryptjs";
import clientPromise from "@/lib/mongodb";
import {
  createVerificationToken,
  verifyToken,
  deleteToken,
  markEmailAsVerified,
} from "@/lib/token";
import { sendVerificationEmail, sendPasswordResetEmail } from "@/lib/email";

const emailSchema = z.object({
  email: z.string().email("Nieprawidłowy adres email"),
});

const resetPasswordSchema = z.object({
  token: z.string(),
  password: z.string().min(6, "Hasło musi mieć co najmniej 6 znaków"),
});

export async function requestPasswordReset(formData: FormData) {
  try {
    const email = formData.get("email") as string;

    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.message,
      };
    }

    const client = await clientPromise;
    const db = client.db();

    // Sprawdź czy użytkownik istnieje
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      // Nie informuj użytkownika czy email istnieje (bezpieczeństwo)
      return {
        success: true,
        message:
          "Jeśli konto o tym adresie email istnieje, wysłaliśmy link do resetowania hasła.",
      };
    }

    // Utwórz token resetowania hasła
    const token = await createVerificationToken(email, "password-reset");

    // Wyślij email (symulacja dla MVP)
    const emailResult = await sendPasswordResetEmail(email, token);

    if (!emailResult.success) {
      return {
        success: false,
        error: "Nie udało się wysłać emaila. Spróbuj ponownie później.",
      };
    }

    return {
      success: true,
      message:
        "📧 MVP: W wersji produkcyjnej tutaj zostałby wysłany email z linkiem do resetowania hasła. Sprawdź logi serwera aby zobaczyć link resetowania.",
    };
  } catch (error) {
    console.error("Błąd przy resetowaniu hasła:", error);
    return {
      success: false,
      error: "Wystąpił błąd. Spróbuj ponownie później.",
    };
  }
}

export async function resetPassword(formData: FormData) {
  try {
    const token = formData.get("token") as string;
    const password = formData.get("password") as string;

    const validation = resetPasswordSchema.safeParse({ token, password });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.message,
      };
    }

    // Zweryfikuj token
    const tokenVerification = await verifyToken(token, "password-reset");

    if (!tokenVerification.valid) {
      return {
        success: false,
        error: tokenVerification.error || "Nieprawidłowy token",
      };
    }

    const client = await clientPromise;
    const db = client.db();

    // Zahashuj nowe hasło
    const hashedPassword = await bcrypt.hash(password, 10);

    // Zaktualizuj hasło użytkownika
    await db.collection("users").updateOne(
      { email: tokenVerification.email },
      {
        $set: {
          password: hashedPassword,
          updatedAt: new Date(),
        },
      },
    );

    // Usuń token
    await deleteToken(token);

    return {
      success: true,
      message:
        "Hasło zostało pomyślnie zresetowane. Możesz się teraz zalogować.",
    };
  } catch (error) {
    console.error("Błąd przy zmianie hasła:", error);
    return {
      success: false,
      error: "Wystąpił błąd. Spróbuj ponownie później.",
    };
  }
}

export async function verifyEmail(token: string) {
  try {
    // Zweryfikuj token
    const tokenVerification = await verifyToken(token, "email-verification");

    if (!tokenVerification.valid) {
      return {
        success: false,
        error: tokenVerification.error || "Nieprawidłowy token",
      };
    }

    // Oznacz email jako zweryfikowany
    await markEmailAsVerified(tokenVerification.email);

    return {
      success: true,
      message:
        "Email został pomyślnie zweryfikowany. Możesz się teraz zalogować.",
    };
  } catch (error) {
    console.error("Błąd przy weryfikacji emaila:", error);
    return {
      success: false,
      error: "Wystąpił błąd. Spróbuj ponownie później.",
    };
  }
}

export async function resendVerificationEmail(email: string) {
  try {
    const validation = emailSchema.safeParse({ email });
    if (!validation.success) {
      return {
        success: false,
        error: validation.error.message,
      };
    }

    const client = await clientPromise;
    const db = client.db();

    // Sprawdź czy użytkownik istnieje i czy email nie jest już zweryfikowany
    const user = await db.collection("users").findOne({ email });

    if (!user) {
      return {
        success: false,
        error: "Nie znaleziono użytkownika o tym adresie email.",
      };
    }

    if (user.emailVerified) {
      return {
        success: false,
        error: "Ten adres email jest już zweryfikowany.",
      };
    }

    // Utwórz nowy token weryfikacyjny
    const token = await createVerificationToken(email, "email-verification");

    // Wyślij email (symulacja dla MVP)
    const emailResult = await sendVerificationEmail(email, token);

    if (!emailResult.success) {
      return {
        success: false,
        error: "Nie udało się wysłać emaila. Spróbuj ponownie później.",
      };
    }

    return {
      success: true,
      message:
        "📧 MVP: W wersji produkcyjnej tutaj zostałby wysłany email weryfikacyjny. Sprawdź logi serwera aby zobaczyć link weryfikacyjny.",
    };
  } catch (error) {
    console.error("Błąd przy ponownym wysyłaniu emaila:", error);
    return {
      success: false,
      error: "Wystąpił błąd. Spróbuj ponownie później.",
    };
  }
}
