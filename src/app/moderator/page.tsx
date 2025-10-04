import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { MobileLayout } from "@/components/mobile-layout";
import Link from "next/link";
import { Shield, ArrowLeft, Users, Flag, Settings } from "lucide-react";
import Image from "next/image";

export default async function ModeratorPage() {
  const session = await auth();

  if (!session) {
    redirect("/auth/signin?callbackUrl=/moderator");
  }

  return (
    <MobileLayout>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        {/* Desktop Header */}
        <header className="hidden border-b bg-white dark:bg-gray-950 md:block">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <div className="flex items-center gap-4">
              <Button asChild variant="ghost" size="sm">
                <Link href="/">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back to Map
                </Link>
              </Button>
              <div className="flex items-center gap-2">
                <Shield className="h-6 w-6 text-blue-600" />
                <h1 className="text-xl font-bold">Moderator Panel</h1>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {session.user?.email}
              </span>
              <Button asChild variant="outline" size="sm">
                <Link href="/user">Profile</Link>
              </Button>
            </div>
          </div>
        </header>

        {/* Mobile Header */}
        <header className="border-b bg-white dark:bg-gray-950 md:hidden">
          <div className="flex h-14 items-center justify-between px-4">
            <div className="flex items-center gap-2">
              <Image
                src="/apple-touch-icon.png"
                alt="OnTime"
                width={28}
                height={28}
                className="rounded-lg"
              />
              <h1 className="text-lg font-bold">Moderator</h1>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h2 className="mb-2 text-3xl font-bold">Moderator Dashboard</h2>
            <p className="text-gray-600 dark:text-gray-400">
              Manage alerts, users, and content moderation
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Pending Reports */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Flag className="h-5 w-5 text-orange-600" />
                  Pending Reports
                </CardTitle>
                <CardDescription>Review user-submitted reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">12</div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Awaiting moderation
                </p>
                <Button className="mt-4 w-full" size="sm">
                  Review Reports
                </Button>
              </CardContent>
            </Card>

            {/* User Management */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-blue-600" />
                  User Management
                </CardTitle>
                <CardDescription>Manage user accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold">248</div>
                <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                  Active users
                </p>
                <Button className="mt-4 w-full" variant="outline" size="sm">
                  Manage Users
                </Button>
              </CardContent>
            </Card>

            {/* Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-gray-600" />
                  Settings
                </CardTitle>
                <CardDescription>Configure moderation rules</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Auto-moderation rules, content filters, and alert thresholds
                </p>
                <Button className="mt-4 w-full" variant="outline" size="sm">
                  Configure
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Recent Moderation Activity</CardTitle>
              <CardDescription>
                Latest actions taken by moderators
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[
                  {
                    action: "Approved alert",
                    user: "user@example.com",
                    time: "2 minutes ago",
                  },
                  {
                    action: "Removed spam report",
                    user: "spam@example.com",
                    time: "15 minutes ago",
                  },
                  {
                    action: "Updated content filter",
                    user: session.user?.email || "moderator@example.com",
                    time: "1 hour ago",
                  },
                ].map((item, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div>
                      <p className="font-medium">{item.action}</p>
                      <p className="text-sm text-gray-600 dark:text-gray-400">
                        by {item.user}
                      </p>
                    </div>
                    <span className="text-sm text-gray-500">{item.time}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    </MobileLayout>
  );
}
