"use client";

import { useMemo, useState } from "react";
import { Bell, MapPin, Trash2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pl } from "date-fns/locale";
import { useAppStore } from "@/store/app-store";
import { useUser } from "@/store/hooks";
import { useJourneyNotificationActions } from "@/hooks/use-journey-notification-actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";

export function JourneyNotificationCenter() {
  const user = useUser();
  const notifications = useAppStore((state) => state.notifications);
  const { dismiss, clear } = useJourneyNotificationActions();
  const [open, setOpen] = useState(false);

  const sortedNotifications = useMemo(
    () =>
      [...notifications].sort((a, b) => {
        const aTime = new Date(a.receivedAt).getTime();
        const bTime = new Date(b.receivedAt).getTime();
        return bTime - aTime;
      }),
    [notifications],
  );

  const totalNotifications = sortedNotifications.length;

  // Hide center for guests
  if (!user) {
    return null;
  }

  return (
    <div>

     </div>
    //   className={cn(
    //     "pointer-events-none fixed right-4 z-[9998]",
    //     "top-[calc(env(safe-area-inset-top,0px)+1rem)] md:top-6",
    //   )}
    // >
    //   <Sheet open={open} onOpenChange={setOpen}>
    //     <div className="pointer-events-auto">
    //       <SheetTrigger asChild>
    //         <Button
    //           variant={totalNotifications > 0 ? "default" : "secondary"}
    //           className="relative flex items-center gap-2 rounded-full px-4 py-2 shadow-md"
    //         >
    //           <Bell className="h-4 w-4" />
    //           <span className="text-sm font-medium">Powiadomienia</span>
    //           {totalNotifications > 0 && (
    //             <Badge className="rounded-full bg-red-500 px-2 text-xs text-white">
    //               {totalNotifications}
    //             </Badge>
    //           )}
    //         </Button>
    //       </SheetTrigger>
    //     </div>
    //     <SheetContent
    //       side="right"
    //       className="w-full max-w-md overflow-hidden border-l bg-background p-0"
    //     >
    //       <SheetHeader className="flex flex-row items-center justify-between gap-2 border-b bg-muted/60 p-4">
    //         <div className="flex items-center gap-2">
    //           <Bell className="h-4 w-4" />
    //           <SheetTitle>Powiadomienia trasy</SheetTitle>
    //         </div>
    //         {totalNotifications > 0 && (
    //           <Button
    //             variant="ghost"
    //             size="sm"
    //             className="gap-1 text-muted-foreground"
    //             onClick={() => void clear()}
    //           >
    //             <Trash2 className="h-4 w-4" />
    //             Wyczyść wszystko
    //           </Button>
    //         )}
    //       </SheetHeader>
    //       <ScrollArea className="h-full max-h-[calc(100vh-9rem)] p-4">
    //         {totalNotifications === 0 ? (
    //           <div className="flex h-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed p-8 text-center text-muted-foreground">
    //             <Bell className="h-8 w-8" />
    //             <p className="text-sm">
    //               Brak aktywnych powiadomień. Gdy pojawią się incydenty na
    //               Twojej trasie, znajdziesz je tutaj.
    //             </p>
    //           </div>
    //         ) : (
    //           <div className="space-y-4">
    //             {sortedNotifications.map((notification) => {
    //               const receivedLabel = formatDistanceToNow(
    //                 new Date(notification.receivedAt),
    //                 {
    //                   addSuffix: true,
    //                   locale: pl,
    //                 },
    //               );

    //               return (
    //                 <div
    //                   key={notification.id}
    //                   className="rounded-xl border bg-card p-4 shadow-sm"
    //                 >
    //                   <div className="flex flex-wrap items-start justify-between gap-2">
    //                     <div className="space-y-1">
    //                       <p className="text-sm font-semibold">
    //                         {notification.title}
    //                       </p>
    //                       <div className="flex items-center gap-2 text-xs text-muted-foreground">
    //                         <MapPin className="h-3.5 w-3.5" />
    //                         <span>
    //                           {notification.lineName ?? "Nieznana linia"}
    //                         </span>
    //                       </div>
    //                     </div>
    //                     <div className="flex flex-col items-end gap-1 text-right">
    //                       {notification.status && (
    //                         <Badge
    //                           variant={
    //                             notification.status === "RESOLVED"
    //                               ? "outline"
    //                               : "default"
    //                           }
    //                         >
    //                           {notification.status === "PUBLISHED"
    //                             ? "Aktywne"
    //                             : notification.status === "RESOLVED"
    //                               ? "Zakończone"
    //                               : "Projekt"}
    //                         </Badge>
    //                       )}
    //                       <span className="text-xs text-muted-foreground">
    //                         {receivedLabel}
    //                       </span>
    //                     </div>
    //                   </div>
    //                   {notification.description && (
    //                     <p className="mt-3 text-sm text-muted-foreground">
    //                       {notification.description}
    //                     </p>
    //                   )}
    //                   {typeof notification.delayMinutes === "number" && (
    //                     <p className="mt-2 text-xs font-medium text-destructive">
    //                       Szacowane opóźnienie: {notification.delayMinutes} min
    //                     </p>
    //                   )}
    //                   <Separator className="my-3" />
    //                   <div className="flex flex-wrap items-center justify-between gap-2">
    //                     <div className="text-xs text-muted-foreground">
    //                       ID incydentu: {notification.id}
    //                     </div>
    //                     <Button
    //                       variant="outline"
    //                       size="sm"
    //                       className="gap-1"
    //                       onClick={() => void dismiss(notification.id)}
    //                     >
    //                       <Trash2 className="h-4 w-4" />
    //                       Odrzuć
    //                     </Button>
    //                   </div>
    //                 </div>
    //               );
    //             })}
    //           </div>
    //         )}
    //       </ScrollArea>
    //     </SheetContent>
    //   </Sheet>
    // </div>
  );
}
