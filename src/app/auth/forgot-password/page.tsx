"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { requestPasswordReset } from "@/app/actions/password";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("email", email);

    const result = await requestPasswordReset(formData);

    if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Email został wysłany",
      });
      setEmail("");
    } else {
      setMessage({
        type: "error",
        text: result.error || "Wystąpił błąd",
      });
    }

    setIsLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">OnTime</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Resetowanie hasła
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Zapomniałeś hasła?</CardTitle>
            <CardDescription>
              Wprowadź swój adres email, a wyślemy Ci link do resetowania hasła.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Adres email</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="twoj@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10"
                    required
                    disabled={isLoading}
                  />
                </div>
              </div>

              {message && (
                <div
                  className={`rounded-lg p-3 text-sm ${
                    message.type === "success"
                      ? "bg-green-50 text-green-800 dark:bg-green-900/20 dark:text-green-300"
                      : "bg-red-50 text-red-800 dark:bg-red-900/20 dark:text-red-300"
                  }`}
                >
                  {message.text}
                </div>
              )}

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Wysyłanie...
                  </>
                ) : (
                  "Wyślij link resetujący"
                )}
              </Button>

              <div className="space-y-2 text-center text-sm">
                <Link
                  href="/auth/signin"
                  className="flex items-center justify-center text-blue-600 hover:text-blue-500 dark:text-blue-400"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Powrót do logowania
                </Link>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
