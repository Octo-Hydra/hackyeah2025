import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Smartphone, Shield, Bell, Zap, Map, ArrowRight } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-950">
      <div className="container mx-auto px-4 py-16">
        <div className="mb-16 text-center">
          <h1 className="mb-4 text-5xl font-bold tracking-tight">
            HackYeah 2025
          </h1>
          <p className="mx-auto mb-8 max-w-2xl text-xl text-gray-600 dark:text-gray-400">
            Progressive Web App with real-time features
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/pwa">
              <Button size="lg" className="gap-2">
                <Smartphone className="h-5 w-5" />
                Try PWA
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/auth/signin">
              <Button size="lg" variant="outline">
                <Shield className="mr-2 h-5 w-5" />
                Sign In
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                PWA
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Install on any device</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notifications
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Real-time push alerts</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Auth
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>NextAuth.js with MongoDB</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Map className="h-5 w-5" />
                Maps
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Geolocation ready</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                WebSockets
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Real-time updates</CardDescription>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                Mobile First
              </CardTitle>
            </CardHeader>
            <CardContent>
              <CardDescription>Optimized for mobile</CardDescription>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
