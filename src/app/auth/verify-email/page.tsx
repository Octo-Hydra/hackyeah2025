"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import Link from "next/link";
import { verifyEmail } from "@/app/actions/password";

export default function VerifyEmailPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [isLoading, setIsLoading] = useState(true);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    const verify = async () => {
      if (!token) {
        setResult({
          success: false,
          message: "Nieprawidłowy link weryfikacyjny",
        });
        setIsLoading(false);
        return;
      }

      const verifyResult = await verifyEmail(token);

      setResult({
        success: verifyResult.success,
        message: verifyResult.success
          ? verifyResult.message || "Email został zweryfikowany"
          : verifyResult.error || "Wystąpił błąd",
      });
      setIsLoading(false);

      // Jeśli sukces, przekieruj do logowania po 5 sekundach
      if (verifyResult.success) {
        setTimeout(() => {
          router.push("/auth/signin");
        }, 5000);
      }
    };

    verify();
  }, [token, router]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-12 dark:bg-gray-900 sm:px-6 lg:px-8">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold">OnTime</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Weryfikacja adresu email
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Weryfikacja email</CardTitle>
            <CardDescription>
              {isLoading
                ? "Weryfikujemy Twój adres email..."
                : result?.success
                  ? "Email został pomyślnie zweryfikowany"
                  : "Nie udało się zweryfikować emaila"}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4 text-center">
              {isLoading ? (
                <>
                  <Loader2 className="mx-auto h-12 w-12 animate-spin text-blue-600" />
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Weryfikowanie...
                  </p>
                </>
              ) : result?.success ? (
                <>
                  <CheckCircle2 className="mx-auto h-12 w-12 text-green-600" />
                  <div className="rounded-lg bg-green-50 p-4 text-sm text-green-800 dark:bg-green-900/20 dark:text-green-300">
                    {result.message}
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Przekierowywanie do strony logowania...
                  </p>
                  <Button asChild className="w-full">
                    <Link href="/auth/signin">Przejdź do logowania</Link>
                  </Button>
                </>
              ) : (
                <>
                  <XCircle className="mx-auto h-12 w-12 text-red-600" />
                  <div className="rounded-lg bg-red-50 p-4 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    {result?.message}
                  </div>
                  <div className="space-y-2">
                    <Button asChild className="w-full">
                      <Link href="/auth/signin">Powrót do logowania</Link>
                    </Button>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Potrzebujesz pomocy? Skontaktuj się z nami.
                    </p>
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
