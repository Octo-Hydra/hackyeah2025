"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bell } from "lucide-react";
import { useAppStore } from "@/store/app-store";
import { useUser } from "@/store/hooks";
import { useIsMobile } from "@/hooks/use-is-mobile";

export function JourneyNotificationCenter() {
  const user = useUser();
  const pathname = usePathname();
  const router = useRouter();
  const { isMobile } = useIsMobile();
  const notifications = useAppStore((state) => state.notifications);
  const addNotification = useAppStore((state) => state.addNotification);

  // Check if we're on the notifications page
  const isOnNotificationsPage = pathname === "/pwa";

  useEffect(() => {
    // Hide center for guests
    if (!user) {
      return;
    }

    // TODO: Add GraphQL subscription here to listen for new notifications
    // When new notification arrives:
    // 1. Add to store: addNotification(newNotification)
    // 2. If NOT on /pwa page, show toast
    // 3. If on mobile and toast clicked, navigate to /pwa

    // Example subscription handler (to be implemented):
    // const unsubscribe = subscribeToNotifications((notification) => {
    //   addNotification(notification);
    //   
    //   if (!isOnNotificationsPage) {
    //     toast.custom(
    //       (t) => (
    //         <div
    //           onClick={() => {
    //             if (isMobile) {
    //               router.push("/pwa");
    //             }
    //             toast.dismiss(t);
    //           }}
    //           className="cursor-pointer rounded-lg bg-white p-4 shadow-lg border border-orange-200 hover:border-orange-300 transition-colors"
    //         >
    //           <div className="flex items-start gap-3">
    //             <div className="flex h-10 w-10 items-center justify-center rounded-full bg-orange-100">
    //               <Bell className="h-5 w-5 text-orange-600" />
    //             </div>
    //             <div className="flex-1">
    //               <p className="font-semibold text-sm">{notification.title}</p>
    //               {notification.description && (
    //                 <p className="text-xs text-gray-600 mt-1">{notification.description}</p>
    //               )}
    //               {notification.lineName && (
    //                 <p className="text-xs text-orange-600 mt-1">Linia: {notification.lineName}</p>
    //               )}
    //             </div>
    //           </div>
    //         </div>
    //       ),
    //       {
    //         duration: 5000,
    //       }
    //     );
    //   }
    // });
    //
    // return () => unsubscribe();
  }, [user, isOnNotificationsPage, isMobile, router, addNotification]);

  // This component doesn't render anything, it just manages notifications
  return null;
}
