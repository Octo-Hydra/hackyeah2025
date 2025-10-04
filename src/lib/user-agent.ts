import { headers } from "next/headers";

/**
 * Server-side user agent detection utility
 * Uses Next.js headers() to detect device type on the server
 */

export interface UserAgentInfo {
  isMobile: boolean;
  isPWA: boolean;
  isIOS: boolean;
  isAndroid: boolean;
  isTablet: boolean;
}

/**
 * Detects if the request is from a mobile device (SSR-safe)
 * @returns UserAgentInfo object with device detection flags
 */
export async function getUserAgentInfo(): Promise<UserAgentInfo> {
  const headersList = await headers();
  const userAgent = headersList.get("user-agent") || "";

  // Mobile device detection
  const mobileRegex =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i;
  const isMobileDevice = mobileRegex.test(userAgent);

  // iOS detection
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent);

  // Android detection
  const isAndroid = /Android/i.test(userAgent);

  // Tablet detection (iPad or Android tablets)
  const isTablet = /iPad|Android(?!.*Mobile)/i.test(userAgent);

  // PWA detection (checks for standalone mode indicators)
  // Note: This is best-effort on server side, client-side detection is more accurate
  const isPWA =
    headersList.get("x-requested-with") === "com.ontime.app" ||
    userAgent.includes("OnTime");

  // Consider tablets as mobile for layout purposes
  const isMobile = isMobileDevice || isTablet;

  return {
    isMobile,
    isPWA,
    isIOS,
    isAndroid,
    isTablet,
  };
}

/**
 * Simple check if device is mobile (SSR-safe)
 */
export async function isMobileDevice(): Promise<boolean> {
  const info = await getUserAgentInfo();
  return info.isMobile;
}

/**
 * Client-side PWA detection (more accurate than server-side)
 * Use this in client components for better PWA detection
 */
export function isPWAClient(): boolean {
  if (typeof window === "undefined") return false;

  // Check for standalone mode (PWA)
  return (
    window.matchMedia("(display-mode: standalone)").matches ||
    (window.navigator as any).standalone === true ||
    document.referrer.includes("android-app://")
  );
}
