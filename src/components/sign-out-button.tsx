"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { signOut } from "next-auth/react";

export function SignOutButton() {
  const [isLoading, setIsLoading] = useState(false);
  const clearStore = useAppStore((state) => state.clearStore);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      // Clear Zustand store before signing out
      clearStore();

      // Clear localStorage
      if (typeof window !== "undefined") {
        localStorage.removeItem("activeJourneyLineIds");
      }

      // Use client-side signOut for immediate session update
      await signOut({
        callbackUrl: "/",
        redirect: true,
      });
    } catch (error) {
      console.error("Error signing out:", error);
      setIsLoading(false);
    }
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
