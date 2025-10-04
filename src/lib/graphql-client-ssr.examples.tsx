// /**
//  * SSR and Client-Side GraphQL Examples
//  *
//  * This file demonstrates practical examples of using the GraphQL client
//  * in different Next.js contexts with proper SSR and client-side handling.
//  */

// // =============================================================================
// // SERVER COMPONENT EXAMPLES
// // =============================================================================

// import {
//   serverQueries,
//   serverMutations,
//   revalidateGraphQL,
// } from "@/lib/graphql-client-ssr";
// import type { ValueTypes } from "@/zeus";

// /**
//  * Example 1: Basic Server Component with User Data
//  * File: app/dashboard/page.tsx
//  */
// export async function DashboardPage() {
//   const { me } = await serverQueries.getCurrentUser();

//   return (
//     <div className="p-8">
//       <h1 className="text-2xl font-bold">Dashboard</h1>
//       <div className="mt-4">
//         <p>
//           <strong>Name:</strong> {me?.name}
//         </p>
//         <p>
//           <strong>Email:</strong> {me?.email}
//         </p>
//         <p>
//           <strong>Role:</strong> {me?.role}
//         </p>
//       </div>
//     </div>
//   );
// }

// /**
//  * Example 2: Server Component with Parallel Data Fetching
//  * File: app/reports/page.tsx
//  */
// export async function ReportsPage() {
//   // Fetch multiple data sources in parallel
//   const [userData, reportsData] = await Promise.all([
//     serverQueries.getCurrentUser(),
//     // You can add more queries here
//     Promise.resolve({ reports: [] }), // Placeholder
//   ]);

//   return (
//     <div>
//       <h1>Reports for {userData.me?.name}</h1>
//       <div>Total Reports: {reportsData.reports.length}</div>
//     </div>
//   );
// }

// /**
//  * Example 3: Server Component with Request Deduplication
//  * File: app/layout.tsx
//  *
//  * Note: The same user query is called in multiple places,
//  * but React cache() ensures only ONE network request is made
//  */
// export async function RootLayout({ children }: { children: React.ReactNode }) {
//   const { me } = await serverQueries.getCurrentUser();

//   return (
//     <html>
//       <body>
//         <Header user={me} />
//         <Sidebar user={me} />
//         <main>{children}</main>
//       </body>
//     </html>
//   );
// }

// function Header({ user }) {
//   return (
//     <header>
//       <h1>Welcome, {user?.name}</h1>
//     </header>
//   );
// }

// function Sidebar({ user }) {
//   return (
//     <aside>
//       <p>Role: {user?.role}</p>
//     </aside>
//   );
// }

// // =============================================================================
// // SERVER ACTION EXAMPLES
// // =============================================================================

// /**
//  * Example 4: Server Action for Creating a Report
//  * File: app/actions/reports.ts
//  */
// ("use server");

// export async function createReportAction(
//   input: ValueTypes["CreateReportInput"],
// ) {
//   try {
//     const result = await serverMutations.createIncidentReport(input);

//     // Revalidate cached data
//     await revalidateGraphQL(["graphql", "reports"]);

//     return {
//       success: true,
//       data: result.carrierMutations?.createReport,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// /**
//  * Example 5: Server Action for Updating a Report
//  * File: app/actions/reports.ts
//  */
// export async function updateReportAction(
//   id: string,
//   input: ValueTypes["UpdateReportInput"],
// ) {
//   try {
//     const result = await serverMutations.updateIncidentReport(id, input);

//     // Revalidate specific tags
//     await revalidateGraphQL(["graphql", "reports", `report-${id}`]);

//     return {
//       success: true,
//       data: result.carrierMutations?.updateReport,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// /**
//  * Example 6: Server Action for Deleting a Report
//  * File: app/actions/reports.ts
//  */
// export async function deleteReportAction(id: string) {
//   try {
//     const result = await serverMutations.deleteIncidentReport(id);

//     // Revalidate after deletion
//     await revalidateGraphQL(["graphql", "reports"]);

//     return {
//       success: result.carrierMutations?.deleteReport.success ?? false,
//       message: result.carrierMutations?.deleteReport.message,
//     };
//   } catch (error) {
//     return {
//       success: false,
//       error: error instanceof Error ? error.message : "Unknown error",
//     };
//   }
// }

// // =============================================================================
// // CLIENT COMPONENT EXAMPLES
// // =============================================================================

// /**
//  * Example 7: Client Component with User Data
//  * File: app/components/UserProfile.tsx
//  */
// ("use client");

// import { useState, useEffect } from "react";
// import { clientQueries, handleGraphQLError } from "@/lib/graphql-client-ssr";

// export function UserProfile() {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     clientQueries
//       .getCurrentUser()
//       .then((result) => setUser(result.me))
//       .catch((err) => setError(handleGraphQLError(err)))
//       .finally(() => setLoading(false));
//   }, []);

//   if (loading) return <div>Loading user profile...</div>;
//   if (error) return <div className="text-red-600">Error: {error}</div>;
//   if (!user) return <div>No user found</div>;

//   return (
//     <div className="p-4 border rounded">
//       <h2 className="text-xl font-bold">{user.name}</h2>
//       <p className="text-gray-600">{user.email}</p>
//       <p className="text-sm">Role: {user.role}</p>
//       <p className="text-sm">
//         2FA: {user.twoFactorEnabled ? "Enabled" : "Disabled"}
//       </p>
//     </div>
//   );
// }

// /**
//  * Example 8: Client Component with Form and Server Action
//  * File: app/components/CreateReportForm.tsx
//  */
// ("use client");

// import { useState } from "react";
// import { createReportAction } from "@/app/actions/reports";

// export function CreateReportForm() {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setSuccess(false);

//     const result = await createReportAction({
//       title,
//       description,
//       kind: "INCIDENT",
//       lineIds: [],
//     });

//     if (result.success) {
//       setSuccess(true);
//       setTitle("");
//       setDescription("");
//     } else {
//       setError(result.error || "Failed to create report");
//     }

//     setLoading(false);
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4">
//       {error && <div className="p-3 bg-red-100 text-red-700">{error}</div>}
//       {success && (
//         <div className="p-3 bg-green-100 text-green-700">
//           Report created successfully!
//         </div>
//       )}

//       <div>
//         <label className="block text-sm font-medium">Title</label>
//         <input
//           type="text"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           className="w-full p-2 border rounded"
//           required
//         />
//       </div>

//       <div>
//         <label className="block text-sm font-medium">Description</label>
//         <textarea
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           className="w-full p-2 border rounded"
//           rows={4}
//         />
//       </div>

//       <button
//         type="submit"
//         disabled={loading}
//         className="px-4 py-2 bg-blue-600 text-white rounded disabled:bg-gray-400"
//       >
//         {loading ? "Creating..." : "Create Report"}
//       </button>
//     </form>
//   );
// }

// /**
//  * Example 9: Client Component with Client-Side Mutation
//  * File: app/components/Enable2FAButton.tsx
//  */
// ("use client");

// import { useState } from "react";
// import { clientMutations, handleGraphQLError } from "@/lib/graphql-client-ssr";

// export function Enable2FAButton() {
//   const [loading, setLoading] = useState(false);
//   const [qrCode, setQrCode] = useState<string | null>(null);
//   const [secret, setSecret] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   const handleEnable2FA = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const result = await clientMutations.setup2FA();
//       setQrCode(result.setup2FA.qrCode);
//       setSecret(result.setup2FA.secret);
//     } catch (err) {
//       setError(handleGraphQLError(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (qrCode && secret) {
//     return (
//       <div className="space-y-4">
//         <h3 className="font-bold">Scan this QR code with your auth app:</h3>
//         <div className="border p-4">
//           <img src={qrCode} alt="2FA QR Code" className="mx-auto" />
//         </div>
//         <p className="text-sm text-gray-600">
//           Secret: <code>{secret}</code>
//         </p>
//       </div>
//     );
//   }

//   return (
//     <div>
//       {error && <div className="mb-4 p-3 bg-red-100 text-red-700">{error}</div>}
//       <button
//         onClick={handleEnable2FA}
//         disabled={loading}
//         className="px-4 py-2 bg-green-600 text-white rounded disabled:bg-gray-400"
//       >
//         {loading ? "Setting up..." : "Enable 2FA"}
//       </button>
//     </div>
//   );
// }

// /**
//  * Example 10: Custom Hook for User Data (Client-Side)
//  * File: app/hooks/useCurrentUser.ts
//  */
// ("use client");

// import { useState, useEffect } from "react";
// import { clientQueries, handleGraphQLError } from "@/lib/graphql-client-ssr";

// export function useCurrentUser() {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const fetchUser = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const result = await clientQueries.getCurrentUser();
//       setUser(result.me);
//     } catch (err) {
//       setError(handleGraphQLError(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   useEffect(() => {
//     fetchUser();
//   }, []);

//   const refetch = () => {
//     fetchUser();
//   };

//   return { user, loading, error, refetch };
// }

// // Usage
// export function UserDashboard() {
//   const { user, loading, error, refetch } = useCurrentUser();

//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error}</div>;

//   return (
//     <div>
//       <h1>Welcome, {user?.name}!</h1>
//       <button onClick={refetch}>Refresh</button>
//     </div>
//   );
// }

// /**
//  * Example 11: Optimistic Update Pattern (Client-Side)
//  * File: app/components/LikeButton.tsx
//  */
// ("use client");

// import { useState } from "react";
// import { clientMutations } from "@/lib/graphql-client-ssr";

// export function LikeButton({ reportId }: { reportId: string }) {
//   const [liked, setLiked] = useState(false);
//   const [loading, setLoading] = useState(false);

//   const handleLike = async () => {
//     // Optimistic update
//     const previousState = liked;
//     setLiked(!liked);
//     setLoading(true);

//     try {
//       // Actual mutation
//       await clientMutations.updateIncidentReport(reportId, {
//         // Add your like field here
//       });
//     } catch (error) {
//       // Revert on error
//       setLiked(previousState);
//       console.error("Failed to like:", error);
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <button onClick={handleLike} disabled={loading} className="text-2xl">
//       {liked ? "❤️" : "🤍"}
//     </button>
//   );
// }

// // =============================================================================
// // HYBRID EXAMPLE: Server Component + Client Component
// // =============================================================================

// /**
//  * Example 12: Server Component with Client Island
//  * File: app/profile/page.tsx
//  */

// // Server Component (default)
// export async function ProfilePage() {
//   // Fetch initial data on the server
//   const { me } = await serverQueries.getCurrentUser();

//   return (
//     <div>
//       <h1>Profile Page</h1>

//       {/* Server-rendered content */}
//       <div className="mb-8">
//         <h2>User Information</h2>
//         <p>Name: {me?.name}</p>
//         <p>Email: {me?.email}</p>
//       </div>

//       {/* Client island for interactive features */}
//       <ProfileActions userId={me?.id || ""} />
//     </div>
//   );
// }

// // Client Component (interactive)
// ("use client");

// function ProfileActions({ userId }: { userId: string }) {
//   const [loading, setLoading] = useState(false);

//   const handleUpdate = async () => {
//     setLoading(true);
//     try {
//       // Client-side mutation
//       await clientMutations.updateIncidentReport(userId, {
//         /* your update */
//       });
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <div>
//       <button onClick={handleUpdate} disabled={loading}>
//         {loading ? "Updating..." : "Update Profile"}
//       </button>
//     </div>
//   );
// }

// // =============================================================================
// // API ROUTE EXAMPLES
// // =============================================================================

// /**
//  * Example 13: API Route with Server Queries
//  * File: app/api/user/route.ts
//  */
// import { NextResponse } from "next/server";

// export async function GET() {
//   try {
//     const { me } = await serverQueries.getCurrentUser();
//     return NextResponse.json({ user: me });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 },
//     );
//   }
// }

// /**
//  * Example 14: API Route with Mutations
//  * File: app/api/reports/route.ts
//  */
// import { NextRequest } from "next/server";

// export async function POST(request: NextRequest) {
//   try {
//     const body = await request.json();

//     const result = await serverMutations.createIncidentReport(body);

//     // Revalidate cache
//     await revalidateGraphQL(["graphql", "reports"]);

//     return NextResponse.json({
//       success: true,
//       data: result.carrierMutations?.createReport,
//     });
//   } catch (error) {
//     return NextResponse.json(
//       { error: error instanceof Error ? error.message : "Unknown error" },
//       { status: 500 },
//     );
//   }
// }
