import crypto from "crypto";
import clientPromise from "@/lib/mongodb";

export interface VerificationToken {
  email: string;
  token: string;
  type: "email-verification" | "password-reset";
  expires: Date;
  createdAt: Date;
}

export async function createVerificationToken(
  email: string,
  type: "email-verification" | "password-reset",
) {
  const token = crypto.randomBytes(32).toString("hex");
  const expiresIn =
    type === "password-reset" ? 60 * 60 * 1000 : 24 * 60 * 60 * 1000; // 1h dla reset hasła, 24h dla weryfikacji email
  const expires = new Date(Date.now() + expiresIn);

  const client = await clientPromise;
  const db = client.db();

  // Usuń stare tokeny dla tego emaila i typu
  await db.collection("verification_tokens").deleteMany({ email, type });

  // Utwórz nowy token
  await db.collection("verification_tokens").insertOne({
    email,
    token,
    type,
    expires,
    createdAt: new Date(),
  });

  return token;
}

export async function verifyToken(
  token: string,
  type: "email-verification" | "password-reset",
) {
  const client = await clientPromise;
  const db = client.db();

  const verificationToken = await db
    .collection("verification_tokens")
    .findOne({ token, type });

  if (!verificationToken) {
    return { valid: false, error: "Token nie znaleziony" };
  }

  if (new Date() > new Date(verificationToken.expires)) {
    // Usuń wygasły token
    await db.collection("verification_tokens").deleteOne({ token });
    return { valid: false, error: "Token wygasł" };
  }

  return {
    valid: true,
    email: verificationToken.email,
  };
}

export async function deleteToken(token: string) {
  const client = await clientPromise;
  const db = client.db();

  await db.collection("verification_tokens").deleteOne({ token });
}

export async function markEmailAsVerified(email: string) {
  const client = await clientPromise;
  const db = client.db();

  await db.collection("users").updateOne(
    { email },
    {
      $set: {
        emailVerified: new Date(),
        updatedAt: new Date(),
      },
    },
  );

  // Usuń wszystkie tokeny weryfikacyjne dla tego emaila
  await db
    .collection("verification_tokens")
    .deleteMany({ email, type: "email-verification" });
}
