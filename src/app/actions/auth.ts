"use server";

import { signIn, signOut } from "@/auth";
import { registerUser, type RegisterData } from "@/lib/auth-utils";
import { AuthError } from "next-auth";

export async function handleCredentialsSignIn(
  formData: FormData,
  redirectTo?: string,
) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: redirectTo || "/",
    });

    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid credentials" };
        default:
          return { error: "Something went wrong" };
      }
    }
    throw error;
  }
}

export async function handleGoogleSignIn(redirectTo?: string) {
  await signIn("google", { redirectTo: redirectTo || "/" });
}

export async function handleFacebookSignIn(redirectTo?: string) {
  await signIn("facebook", { redirectTo: redirectTo || "/" });
}

export async function handleRegister(data: RegisterData) {
  try {
    const result = await registerUser(data);
    return { success: true, userId: result.userId };
  } catch (error) {
    if (error instanceof Error) {
      return { error: error.message };
    }
    return { error: "Failed to register user" };
  }
}

export async function handleRejestracja(data: {
  name: string;
  email: string;
  password: string;
}) {
  return handleRegister(data);
}

export async function handleSignOut() {
  await signOut({ redirectTo: "/" });
}
