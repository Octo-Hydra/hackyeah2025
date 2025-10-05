/**
 * LocalStorage helper for managing dismissed (closed) notifications
 * Stores notification IDs that user explicitly closed/dismissed
 */

const STORAGE_KEY = "ontime_dismissed_notifications";
const VISITED_PAGE_KEY = "ontime_visited_notifications_page";

export interface DismissedNotificationsStorage {
  dismissedIds: string[];
  lastUpdated: string;
}

/**
 * Mark that user visited the notifications page
 */
export function markNotificationsPageVisited(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(VISITED_PAGE_KEY, new Date().toISOString());
  } catch (error) {
    console.error("Error marking notifications page as visited:", error);
  }
}

/**
 * Check if user has visited the notifications page
 */
export function hasVisitedNotificationsPage(): boolean {
  if (typeof window === "undefined") return false;

  try {
    return localStorage.getItem(VISITED_PAGE_KEY) !== null;
  } catch (error) {
    console.error("Error checking notifications page visit:", error);
    return false;
  }
}

/**
 * Clear the visited flag (e.g., when new notifications arrive)
 */
export function clearNotificationsPageVisit(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(VISITED_PAGE_KEY);
  } catch (error) {
    console.error("Error clearing notifications page visit flag:", error);
  }
}

/**
 * Get list of dismissed notification IDs from localStorage
 */
export function getDismissedNotificationIds(): string[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const data: DismissedNotificationsStorage = JSON.parse(stored);
    return data.dismissedIds || [];
  } catch (error) {
    console.error("Error reading dismissed notifications from localStorage:", error);
    return [];
  }
}

/**
 * Add notification ID to dismissed list in localStorage
 */
export function addDismissedNotificationId(notificationId: string): void {
  if (typeof window === "undefined") return;

  try {
    const currentIds = getDismissedNotificationIds();
    
    // Avoid duplicates
    if (currentIds.includes(notificationId)) return;

    const data: DismissedNotificationsStorage = {
      dismissedIds: [...currentIds, notificationId],
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error saving dismissed notification to localStorage:", error);
  }
}

/**
 * Remove notification ID from dismissed list (if user wants to see it again)
 */
export function removeDismissedNotificationId(notificationId: string): void {
  if (typeof window === "undefined") return;

  try {
    const currentIds = getDismissedNotificationIds();
    const data: DismissedNotificationsStorage = {
      dismissedIds: currentIds.filter(id => id !== notificationId),
      lastUpdated: new Date().toISOString(),
    };

    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Error removing dismissed notification from localStorage:", error);
  }
}

/**
 * Clear all dismissed notifications from localStorage
 */
export function clearDismissedNotifications(): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.error("Error clearing dismissed notifications from localStorage:", error);
  }
}

/**
 * Check if notification is dismissed
 */
export function isNotificationDismissed(notificationId: string): boolean {
  const dismissedIds = getDismissedNotificationIds();
  return dismissedIds.includes(notificationId);
}

/**
 * Filter out dismissed notifications from array
 */
export function filterDismissedNotifications<T extends { id: string }>(
  notifications: T[]
): T[] {
  const dismissedIds = new Set(getDismissedNotificationIds());
  return notifications.filter(notif => !dismissedIds.has(notif.id));
}
