import { auth } from "@/auth";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { signOut } from "@/auth";

export default async function DashboardPage() {
  const session = await auth();

  if (!session) {
    return null;
  }

  return (
    <div className="container mx-auto py-10">
      <Card>
        <CardHeader>
          <CardTitle>Welcome to your Dashboard</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Name:</p>
            <p className="font-medium">{session.user?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">Email:</p>
            <p className="font-medium">{session.user?.email}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">User ID:</p>
            <p className="font-mono text-sm">{session.user?.id}</p>
          </div>
          <form
            action={async () => {
              "use server";
              await signOut();
            }}
          >
            <Button type="submit" variant="destructive">
              Sign Out
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
