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
import { Plus } from "lucide-react";

export function AddEventDialog() {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg"
          aria-label="Add route event"
        >
          <Plus className="h-6 w-6" />
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add Route Event</DialogTitle>
          <DialogDescription>
            Report a new traffic event or road condition
          </DialogDescription>
        </DialogHeader>
        <div className="py-6 text-center text-muted-foreground">
          Add route event here
        </div>
      </DialogContent>
    </Dialog>
  );
}
