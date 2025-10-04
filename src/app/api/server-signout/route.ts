import { signOut } from "@/auth";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  await signOut({ redirect: false });

  return NextResponse.redirect(new URL("/", request.url));
}
