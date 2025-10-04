"use client";

import { useEffect } from "react";

/**
 * Hook to prevent mobile viewport issues with fixed elements
 * Handles iOS Safari address bar showing/hiding which changes viewport height
 */
export function useViewportFix() {
  useEffect(() => {
    // Only apply on mobile
    const isMobile = window.innerWidth < 768;
    if (!isMobile) return;

    // Function to handle viewport resize
    const handleResize = () => {
      // Update CSS variable for dynamic viewport height
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--vh", `${vh}px`);
    };

    // Set initial value
    handleResize();

    // Update on resize and orientation change
    window.addEventListener("resize", handleResize);
    window.addEventListener("orientationchange", handleResize);

    // Prevent pull-to-refresh on mobile
    let touchStartY = 0;
    const preventPullToRefresh = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;

      const touchY = e.touches[0].clientY;
      const touchYDelta = touchY - touchStartY;

      if (touchYDelta > 0 && window.scrollY === 0) {
        e.preventDefault();
      }
    };

    const setTouchStart = (e: TouchEvent) => {
      touchStartY = e.touches[0].clientY;
    };

    document.addEventListener("touchstart", setTouchStart, { passive: false });
    document.addEventListener("touchmove", preventPullToRefresh, {
      passive: false,
    });

    return () => {
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("orientationchange", handleResize);
      document.removeEventListener("touchstart", setTouchStart);
      document.removeEventListener("touchmove", preventPullToRefresh);
    };
  }, []);
}
