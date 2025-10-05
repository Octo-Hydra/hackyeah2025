"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
} from "@/components/ui/card";
import {
  handleGoogleSignIn,
  handleFacebookSignIn,
  handleRegister,
} from "@/app/actions/auth";
import { useAppStore } from "@/store/app-store";
import { Query } from "@/lib/graphql_request";

export default function InterceptedSignInPage() {
  const router = useRouter();
  const { data: session, status, update } = useSession();
  const [isOpen, setIsOpen] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setUser = useAppStore((state) => state.setUser);
  const setMapCenter = useAppStore((state) => state.setMapCenter);

  // Bind OAuth sign-in actions to return to root
  const handleGoogleSignInWithReturn = handleGoogleSignIn.bind(null, "/");
  const handleFacebookSignInWithReturn = handleFacebookSignIn.bind(null, "/");

  // Pobierz dane użytkownika i zaktualizuj store po zalogowaniu
  useEffect(() => {
    const fetchUserData = async () => {
      if (status === "authenticated" && session) {
        try {
          // Pobierz dane użytkownika z GraphQL
          const query = Query();
          const result = await query({
            me: {
              id: true,
              name: true,
              email: true,

              reputation: true,
              activeJourney: {
                segments: {
                  from: {
                    stopId: true,
                    stopName: true,
                    coordinates: {
                      latitude: true,
                      longitude: true,
                    },
                  },
                  to: {
                    stopId: true,
                    stopName: true,
                    coordinates: {
                      latitude: true,
                      longitude: true,
                    },
                  },
                  lineId: true,
                  lineName: true,
                  transportType: true,
                  departureTime: true,
                  arrivalTime: true,
                  duration: true,
                  hasIncident: true,
                },
                startTime: true,
                expectedEndTime: true,
              },
            },
          });

          if (result.me) {
            console.log("📦 Modal: GraphQL me result:", result.me);

            const activeJourneyData = result.me.activeJourney
              ? {
                  segments: result.me.activeJourney.segments.map((seg) => ({
                    from: {
                      stopId: seg.from.stopId,
                      stopName: seg.from.stopName,
                      coordinates: {
                        latitude: seg.from.coordinates.latitude,
                        longitude: seg.from.coordinates.longitude,
                      },
                    },
                    to: {
                      stopId: seg.to.stopId,
                      stopName: seg.to.stopName,
                      coordinates: {
                        latitude: seg.to.coordinates.latitude,
                        longitude: seg.to.coordinates.longitude,
                      },
                    },
                    lineId: seg.lineId,
                    lineName: seg.lineName,
                    transportType: seg.transportType as "BUS" | "RAIL",
                    departureTime: seg.departureTime,
                    arrivalTime: seg.arrivalTime,
                    duration: seg.duration,
                    hasIncident: seg.hasIncident,
                  })),
                  startTime: result.me.activeJourney.startTime,
                  expectedEndTime: result.me.activeJourney.expectedEndTime,
                }
              : undefined;

            console.log("🚗 Modal: Active journey data:", activeJourneyData);

            // Aktualizuj Zustand store
            setUser({
              id: result.me.id,
              name: result.me.name,
              email: result.me.email,
              image: result.me.image as string | null | undefined,
              reputation: result.me.reputation ?? undefined,
              activeJourney: activeJourneyData,
            });

            console.log("✅ Modal: User saved to store");

            // Ustaw mapCenter na początek aktywnej podróży
            if (activeJourneyData?.segments?.[0]?.from.coordinates) {
              setMapCenter([
                activeJourneyData.segments[0].from.coordinates.latitude,
                activeJourneyData.segments[0].from.coordinates.longitude,
              ]);
              console.log(
                "📍 Modal: Map center set to:",
                activeJourneyData.segments[0].from.stopName,
              );
            }
          }

          setIsLoading(false);
          setIsOpen(false);
          console.log("✅ Modal: Closing dialog");
        } catch (error) {
          console.error("Error fetching user data:", error);
          setIsLoading(false);
          setIsOpen(false);
        }
      }
    };

    fetchUserData();
  }, [status, session, setUser, setMapCenter]);

  useEffect(() => {
    if (!isOpen) {
      router.back();
    }
  }, [isOpen, router]);

  const handleSignInSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    // Use next-auth/react signIn for modal (no redirect)
    const { signIn } = await import("next-auth/react");
    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    if (result?.error) {
      setError("Invalid credentials");
      setIsLoading(false);
    } else if (result?.ok) {
      // Session will be updated automatically
      // The useEffect will handle closing the modal
      await update();
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    const result = await handleRegister({
      name: formData.get("name") as string,
      email,
      password,
    });

    if (result.error) {
      setError(result.error);
      setIsLoading(false);
    } else {
      // Auto sign in after registration
      const { signIn } = await import("next-auth/react");
      const signInResult = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (signInResult?.error) {
        setError("Registration successful but failed to sign in");
        setIsLoading(false);
      } else if (signInResult?.ok) {
        // Session will be updated automatically
        await update();
      }
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[95vh] overflow-y-auto pt-10 sm:max-w-[500px]">
        <DialogTitle className="sr-only">Logowanie</DialogTitle>
        <Tabs defaultValue="signin" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="signin">Logowanie</TabsTrigger>
            <TabsTrigger value="register">Rejestracja</TabsTrigger>
          </TabsList>

          <TabsContent value="signin">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0">
                <CardDescription>
                  Zaloguj się do swojego konta za pomocą danych logowania,
                  Google lub Facebooka.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0">
                <form onSubmit={handleSignInSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="signin-email">Adres e-mail</Label>
                    <Input
                      id="signin-email"
                      name="email"
                      type="email"
                      placeholder="jan.kowalski@example.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="signin-password">Hasło</Label>
                      <a
                        href="/auth/forgot-password"
                        onClick={(e) => {
                          e.preventDefault();
                          setIsOpen(false);
                          router.push("/auth/forgot-password");
                        }}
                        className="text-xs text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                      >
                        Przypomnij hasło
                      </a>
                    </div>
                    <Input
                      id="signin-password"
                      name="password"
                      type="password"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logowanie..." : "Zaloguj się"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 dark:bg-gray-950">
                      Lub kontynuuj za pomocą
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <form action={handleGoogleSignInWithReturn}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Zaloguj się przez Google
                    </Button>
                  </form>

                  <form action={handleFacebookSignInWithReturn}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="#1877F2"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Zaloguj się przez Facebooka
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="register">
            <Card className="border-0 shadow-none">
              <CardHeader className="px-0">
                <CardDescription>
                  Utwórz nowe konto, aby rozpocząć.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 px-0">
                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="register-name">Imię i nazwisko</Label>
                    <Input
                      id="register-name"
                      name="name"
                      type="text"
                      placeholder="Jan Kowalski"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-email">Adres e-mail</Label>
                    <Input
                      id="register-email"
                      name="email"
                      type="email"
                      placeholder="jan.kowalski@example.com"
                      required
                      disabled={isLoading}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="register-password">Hasło</Label>
                    <Input
                      id="register-password"
                      name="password"
                      type="password"
                      required
                      disabled={isLoading}
                      minLength={6}
                    />
                    <p className="text-xs text-gray-500">
                      Hasło musi mieć co najmniej 6 znaków
                    </p>
                  </div>
                  {error && (
                    <div className="rounded-md bg-red-50 p-3 text-sm text-red-800 dark:bg-red-900/20 dark:text-red-400">
                      {error}
                    </div>
                  )}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Tworzenie konta..." : "Utwórz konto"}
                  </Button>
                </form>

                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500 dark:bg-gray-950">
                      Lub kontynuuj za pomocą
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <form action={handleGoogleSignInWithReturn}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                        <path
                          d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                          fill="#4285F4"
                        />
                        <path
                          d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                          fill="#34A853"
                        />
                        <path
                          d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                          fill="#FBBC05"
                        />
                        <path
                          d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                          fill="#EA4335"
                        />
                      </svg>
                      Zarejestruj się przez Google
                    </Button>
                  </form>

                  <form action={handleFacebookSignInWithReturn}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full"
                      disabled={isLoading}
                    >
                      <svg
                        className="mr-2 h-4 w-4"
                        viewBox="0 0 24 24"
                        fill="#1877F2"
                      >
                        <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                      </svg>
                      Zarejestruj się przez Facebooka
                    </Button>
                  </form>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
