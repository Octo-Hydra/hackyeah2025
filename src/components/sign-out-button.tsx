"use client";

import { signOut } from "next-auth/react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);

  const handleSignOut = async () => {
    setIsLoading(true);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <Button
      onClick={handleSignOut}
      variant="destructive"
      className="w-full"
      disabled={isLoading}
    >
      {isLoading ? "Wylogowywanie..." : "Wyloguj się"}
    </Button>
  );
}
