"use client";

import { useState, useEffect } from "react";

/**
 * Client-side hook to detect mobile device
 * Checks on initial mount to avoid hydration mismatch
 */
export function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    // Check if mobile on mount
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      setIsInitialized(true);
    };

    checkMobile();

    // Optional: listen for resize events
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return { isMobile, isInitialized };
}
