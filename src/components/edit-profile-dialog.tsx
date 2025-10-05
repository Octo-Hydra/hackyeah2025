"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Mutation } from "@/lib/graphql_request";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { useAppStore } from "@/store/app-store";

interface EditProfileDialogProps {
  currentName?: string | null;
  children?: React.ReactNode;
}

export function EditProfileDialog({
  currentName,
  children,
}: EditProfileDialogProps) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(currentName ?? "");
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();
  const setUser = useAppStore((state) => state.setUser);
  const currentUser = useAppStore((state) => state.user);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    const trimmedName = name.trim();

    // Client-side validation
    if (!trimmedName) {
      toast.error("Imię nie może być puste");
      return;
    }

    if (trimmedName.length > 100) {
      toast.error("Imię jest za długie (max 100 znaków)");
      return;
    }

    setIsPending(true);

    try {
      console.log("🔵 Calling GraphQL mutation from client...");
      
      const mutation = Mutation();
      const result = await mutation({
        updateProfile: [
          {
            input: {
              name: trimmedName,
            },
          },
          {
            id: true,
            name: true,
            email: true,
            reputation: true,
          },
        ],
      });

      console.log("🔵 GraphQL result:", result);

      if (!result.updateProfile) {
        throw new Error("Nie udało się zaktualizować profilu");
      }

      // Update the store with new user data
      if (currentUser) {
        setUser({
          ...currentUser,
          name: result.updateProfile.name,
        });
      }

      toast.success("Profil zaktualizowany pomyślnie!");
      setOpen(false);
      
      // Refresh the page to get all updated data from server
      router.refresh();
    } catch (error) {
      console.error("❌ Error updating profile:", error);
      toast.error(
        error instanceof Error
          ? error.message
          : "Wystąpił błąd podczas aktualizacji profilu"
      );
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children || (
          <Button variant="outline" className="w-full justify-start">
            Edytuj profil
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Edytuj profil</DialogTitle>
          <DialogDescription>
            Zaktualizuj swoje dane osobowe. Kliknij zapisz, gdy skończysz.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Imię</Label>
            <Input
              id="name"
              name="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Wpisz swoje imię"
              maxLength={100}
              required
              disabled={isPending}
            />
            <p className="text-xs text-muted-foreground">
              Maksymalnie 100 znaków
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isPending}
            >
              Anuluj
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Zapisywanie...
                </>
              ) : (
                "Zapisz zmiany"
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
