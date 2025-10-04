"use server";

import { signIn } from "@/auth";
import { registerUser, type RegisterData } from "@/lib/auth-utils";
import { AuthError } from "next-auth";

export async function handleCredentialsSignIn(formData: FormData) {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/",
    });
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

export async function handleGoogleSignIn() {
  await signIn("google", { redirectTo: "/" });
}

export async function handleFacebookSignIn() {
  await signIn("facebook", { redirectTo: "/" });
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
