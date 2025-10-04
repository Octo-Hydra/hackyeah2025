"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import { Lock, Loader2, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { resetPassword } from "@/app/actions/password";

export default function ResetPasswordPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!token) {
      setMessage({
        type: "error",
        text: "Nieprawidłowy link resetowania hasła",
      });
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setMessage({
        type: "error",
        text: "Hasła nie są identyczne",
      });
      return;
    }

    if (!token) {
      setMessage({
        type: "error",
        text: "Nieprawidłowy token",
      });
      return;
    }

    setIsLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append("token", token);
    formData.append("password", password);

    const result = await resetPassword(formData);

    if (result.success) {
      setMessage({
        type: "success",
        text: result.message || "Hasło zostało zresetowane",
      });
      setPassword("");
      setConfirmPassword("");

      // Przekieruj do strony logowania po 3 sekundach
      setTimeout(() => {
        router.push("/auth/signin");
      }, 3000);
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
            Ustaw nowe hasło
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Nowe hasło</CardTitle>
            <CardDescription>Wprowadź swoje nowe hasło poniżej</CardDescription>
          </CardHeader>
          <CardContent>
            {message?.type === "success" ? (
              <div className="space-y-4 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                  {message.text}
                </div>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Przekierowywanie do strony logowania...
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="password">Nowe hasło</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="Minimum 6 znaków"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading || !token}
                      minLength={6}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="confirmPassword">Potwierdź hasło</Label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <Input
                      id="confirmPassword"
                      type="password"
                      placeholder="Powtórz hasło"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="pl-10"
                      required
                      disabled={isLoading || !token}
                      minLength={6}
                    />
                  </div>
                </div>

                {message && message.type === "error" && (
                  <div className="rounded-lg bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {message.text}
                  </div>
                )}

                <Button
                  type="submit"
                  className="w-full"
                  disabled={isLoading || !token}
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Resetowanie...
                    </>
                  ) : (
                    "Zresetuj hasło"
                  )}
                </Button>

                <div className="text-center text-sm">
                  <Link
                    href="/auth/signin"
                    className="text-blue-600 hover:text-blue-500 dark:text-blue-400"
                  >
                    Powrót do logowania
                  </Link>
                </div>
              </form>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
