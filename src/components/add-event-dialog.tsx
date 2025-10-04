"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

export function AddEventDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Dodaj zdarzenie na trasie"
        >
          <AlertTriangle className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Dodaj zdarzenie na trasie</DialogTitle>
          <DialogDescription>
            Zgłoś nowe zdarzenie drogowe lub warunki na drodze
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Tutaj dodaj zdarzenie na trasie
        </div>
      </DialogContent>
    </Dialog>
  );
}
