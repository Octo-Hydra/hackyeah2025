"use client";

/**
 * App Store Provider
 * Initializes Zustand store with SSR-fetched data
 */

import { useEffect, useRef } from "react";
import { useAppStore, type User } from "./app-store";

interface AppStoreProviderProps {
  user: User | null;
  children: React.ReactNode;
}

export function AppStoreProvider({ user, children }: AppStoreProviderProps) {
  const initialized = useRef(false);

  useEffect(() => {
    // Initialize store with SSR data only once
    if (!initialized.current) {
      if (user) {
        useAppStore.getState().setUser(user);
      }
      initialized.current = true;
    }
  }, [user]);

  return <>{children}</>;
}
