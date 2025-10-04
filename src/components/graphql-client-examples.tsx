// /**
//  * Example React Component using the GraphQL Client
//  *
//  * This file demonstrates how to use the GraphQL client in a Next.js React component.
//  * Both client-side and server-side usage examples are included.
//  */

// "use client";

// import { useState, useEffect } from "react";
// import {
//   graphqlClient,
//   queries,
//   mutations,
//   thunderClient,
// } from "@/lib/graphql-client";
// import type { ValueTypes } from "@/zeus";

// /**
//  * Example 1: Fetching user data in a client component
//  */
// export function UserProfileComponent() {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     async function fetchUser() {
//       try {
//         setLoading(true);
//         const result = await queries.getCurrentUser();
//         setUser(result.me);
//       } catch (err) {
//         setError(graphqlClient.handleGraphQLError(err));
//       } finally {
//         setLoading(false);
//       }
//     }

//     fetchUser();
//   }, []);

//   if (loading) return <div>Loading...</div>;
//   if (error) return <div>Error: {error}</div>;
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
//  * Example 2: Creating an incident report with a form
//  */
// export function CreateIncidentForm() {
//   const [title, setTitle] = useState("");
//   const [description, setDescription] = useState("");
//   const [kind, setKind] = useState<"TRAFFIC_JAM" | "INCIDENT">("INCIDENT");
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [success, setSuccess] = useState(false);

//   const handleSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setLoading(true);
//     setError(null);
//     setSuccess(false);

//     try {
//       const input: ValueTypes["CreateReportInput"] = {
//         title,
//         description,
//         kind,
//         lineIds: [],
//       };

//       const result = await mutations.createIncidentReport(input);

//       if (result.carrierMutations?.createReport) {
//         setSuccess(true);
//         setTitle("");
//         setDescription("");
//       }
//     } catch (err) {
//       setError(graphqlClient.handleGraphQLError(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return (
//     <form onSubmit={handleSubmit} className="space-y-4 p-4 border rounded">
//       <h2 className="text-xl font-bold">Create Incident Report</h2>

//       {error && (
//         <div className="p-3 bg-red-100 text-red-700 rounded">{error}</div>
//       )}

//       {success && (
//         <div className="p-3 bg-green-100 text-green-700 rounded">
//           Report created successfully!
//         </div>
//       )}

//       <div>
//         <label className="block text-sm font-medium mb-1">Title</label>
//         <input
//           type="text"
//           value={title}
//           onChange={(e) => setTitle(e.target.value)}
//           className="w-full p-2 border rounded"
//           required
//         />
//       </div>

//       <div>
//         <label className="block text-sm font-medium mb-1">Description</label>
//         <textarea
//           value={description}
//           onChange={(e) => setDescription(e.target.value)}
//           className="w-full p-2 border rounded"
//           rows={4}
//         />
//       </div>

//       <div>
//         <label className="block text-sm font-medium mb-1">Type</label>
//         <select
//           value={kind}
//           onChange={(e) =>
//             setKind(e.target.value as "TRAFFIC_JAM" | "INCIDENT")
//           }
//           className="w-full p-2 border rounded"
//         >
//           <option value="INCIDENT">Incident</option>
//           <option value="TRAFFIC_JAM">Traffic Jam</option>
//           <option value="NETWORK_FAILURE">Network Failure</option>
//           <option value="VEHICLE_FAILURE">Vehicle Failure</option>
//         </select>
//       </div>

//       <button
//         type="submit"
//         disabled={loading}
//         className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
//       >
//         {loading ? "Creating..." : "Create Report"}
//       </button>
//     </form>
//   );
// }

// /**
//  * Example 3: Custom hook for fetching data
//  */
// export function useCurrentUser() {
//   const [user, setUser] = useState<any>(null);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     let mounted = true;

//     async function fetchUser() {
//       try {
//         setLoading(true);
//         const result = await queries.getCurrentUser();

//         if (mounted) {
//           setUser(result.me);
//         }
//       } catch (err) {
//         if (mounted) {
//           setError(graphqlClient.handleGraphQLError(err));
//         }
//       } finally {
//         if (mounted) {
//           setLoading(false);
//         }
//       }
//     }

//     fetchUser();

//     return () => {
//       mounted = false;
//     };
//   }, []);

//   const refetch = async () => {
//     setLoading(true);
//     setError(null);

//     try {
//       const result = await queries.getCurrentUser();
//       setUser(result.me);
//     } catch (err) {
//       setError(graphqlClient.handleGraphQLError(err));
//     } finally {
//       setLoading(false);
//     }
//   };

//   return { user, loading, error, refetch };
// }

// /**
//  * Example 4: Component using the custom hook
//  */
// export function UserDashboard() {
//   const { user, loading, error, refetch } = useCurrentUser();

//   if (loading) return <div>Loading user data...</div>;
//   if (error) return <div>Error: {error}</div>;
//   if (!user) return <div>Please log in</div>;

//   return (
//     <div className="space-y-4">
//       <div className="flex justify-between items-center">
//         <h1 className="text-2xl font-bold">Welcome, {user.name}!</h1>
//         <button
//           onClick={refetch}
//           className="px-3 py-1 bg-gray-200 rounded hover:bg-gray-300"
//         >
//           Refresh
//         </button>
//       </div>

//       <div className="grid grid-cols-2 gap-4">
//         <div className="p-4 border rounded">
//           <h3 className="font-semibold">Email</h3>
//           <p>{user.email}</p>
//         </div>

//         <div className="p-4 border rounded">
//           <h3 className="font-semibold">Role</h3>
//           <p className="capitalize">{user.role.toLowerCase()}</p>
//         </div>

//         <div className="p-4 border rounded">
//           <h3 className="font-semibold">2FA Status</h3>
//           <p>{user.twoFactorEnabled ? "✓ Enabled" : "✗ Disabled"}</p>
//         </div>

//         <div className="p-4 border rounded">
//           <h3 className="font-semibold">Member Since</h3>
//           <p>{new Date(user.createdAt).toLocaleDateString()}</p>
//         </div>
//       </div>
//     </div>
//   );
// }

// /**
//  * Example 5: Using Thunder client directly in a component
//  */
// export function CustomQueryComponent() {
//   const [data, setData] = useState<any>(null);

//   useEffect(() => {
//     async function fetchData() {
//       // Complex query with multiple fields
//       const result = await thunderClient("query")({
//         me: {
//           id: true,
//           name: true,
//           email: true,
//           role: true,
//           twoFactorEnabled: true,
//           createdAt: true,
//           updatedAt: true,
//         },
//       });

//       setData(result);
//     }

//     fetchData();
//   }, []);

//   if (!data) return <div>Loading...</div>;

//   return (
//     <div>
//       <pre className="bg-gray-100 p-4 rounded overflow-auto">
//         {JSON.stringify(data, null, 2)}
//       </pre>
//     </div>
//   );
// }

// /**
//  * Example 6: Mutation with optimistic updates
//  */
// export function Enable2FAButton() {
//   const [loading, setLoading] = useState(false);
//   const [qrCode, setQrCode] = useState<string | null>(null);
//   const [secret, setSecret] = useState<string | null>(null);

//   const handleEnable2FA = async () => {
//     setLoading(true);

//     try {
//       const result = await mutations.setup2FA();

//       setQrCode(result.setup2FA.qrCode);
//       setSecret(result.setup2FA.secret);
//     } catch (error) {
//       console.error("Failed to setup 2FA:", error);
//       alert("Failed to enable 2FA. Please try again.");
//     } finally {
//       setLoading(false);
//     }
//   };

//   if (qrCode && secret) {
//     return (
//       <div className="space-y-4">
//         <h3 className="font-bold">Scan this QR code with your auth app:</h3>
//         <img src={qrCode} alt="2FA QR Code" className="border rounded" />
//         <p className="text-sm">Secret: {secret}</p>
//       </div>
//     );
//   }

//   return (
//     <button
//       onClick={handleEnable2FA}
//       disabled={loading}
//       className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 disabled:bg-gray-400"
//     >
//       {loading ? "Setting up..." : "Enable 2FA"}
//     </button>
//   );
// }
