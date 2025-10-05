"use client";

import { useState } from "react";
import { Menu, User as UserIcon, LogOut, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import Link from "next/link";
import type { Session } from "next-auth";

interface DesktopMenuProps {
  session: Session;
}

export function DesktopMenu({ session }: DesktopMenuProps) {
  const [open, setOpen] = useState(false);

  const handleSignOut = async () => {
    setOpen(false);
    await signOut({ callbackUrl: "/" });
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="gap-2">
          <Menu className="h-5 w-5" />
          <span className="hidden lg:inline">Menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56 z-[9899999]">
        <DropdownMenuLabel>
          <div className="flex flex-col space-y-1">
            <p className="text-sm font-medium leading-none">
              {session.user?.name || "Użytkownik"}
            </p>
            <p className="text-xs leading-none text-muted-foreground">
              {session.user?.email}
            </p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/user" className="flex items-center cursor-pointer">
            <UserIcon className="mr-2 h-4 w-4" />
            <span>Mój profil</span>
          </Link>
        </DropdownMenuItem>
        {session.user?.role === "ADMIN" && (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="flex items-center cursor-pointer">
              <Shield className="mr-2 h-4 w-4" />
              <span>Panel admina</span>
            </Link>
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={handleSignOut}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Wyloguj się</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
