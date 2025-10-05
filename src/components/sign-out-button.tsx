"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAppStore } from "@/store/app-store";
import { signOut } from "next-auth/react";
import { LogOut } from "lucide-react";
import { closeWSConnection } from "@/hooks/use-graphql-subscriptions";

interface SignOutButtonProps {
  variant?: "default" | "destructive" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  className?: string;
  showIcon?: boolean;
}

export function SignOutButton({
  variant = "destructive",
  size = "default",
  className = "w-full",
  showIcon = false,
}: SignOutButtonProps) {
  const [isLoading, setIsLoading] = useState(false);
  const clearStore = useAppStore((state) => state.clearStore);

  const handleSignOut = async () => {
    setIsLoading(true);

    try {
      // Close WebSocket connection first
      closeWSConnection();
      console.log("[Logout] WebSocket connection closed");

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
      variant={variant}
      size={size}
      className={className}
      disabled={isLoading}
    >
      {showIcon && <LogOut className="mr-2 h-4 w-4" />}
      {isLoading ? "..." : "Wyloguj"}
    </Button>
  );
}
