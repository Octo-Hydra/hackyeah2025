// /**
//  * GraphQL Client Usage Examples
//  *
//  * This file demonstrates various ways to use the GraphQL client
//  * with the zeus-graphql package in your application.
//  */

// import {
//   graphqlClient,
//   thunderClient,
//   chainClient,
//   queries,
//   mutations,
// } from "./graphql-client";
// import type { ValueTypes } from "@/zeus";

// /**
//  * Example 1: Simple query using pre-built helpers
//  */
// export async function exampleGetCurrentUser() {
//   try {
//     const result = await queries.getCurrentUser();
//     console.log("Current user:", result.me);
//     return result.me;
//   } catch (error) {
//     console.error(
//       "Error fetching user:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 2: Using Thunder client directly for custom queries
//  */
// export async function exampleCustomQuery() {
//   try {
//     const result = await thunderClient("query")({
//       me: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         twoFactorEnabled: true,
//       },
//     });
//     return result.me;
//   } catch (error) {
//     console.error("Error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 3: Using Chain client for more control
//  */
// export async function exampleChainQuery() {
//   try {
//     const result = await chainClient("query")({
//       me: {
//         id: true,
//         name: true,
//         email: true,
//       },
//     });
//     return result.me;
//   } catch (error) {
//     console.error("Error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 4: Register a new user
//  */
// export async function exampleRegister(
//   name: string,
//   email: string,
//   password: string,
// ) {
//   try {
//     const input: ValueTypes["RegisterInput"] = {
//       name,
//       email,
//       password,
//     };

//     const result = await mutations.register(input);

//     if (result.register.success) {
//       console.log("User registered successfully:", result.register.userId);
//     } else {
//       console.error("Registration failed:", result.register.message);
//     }

//     return result.register;
//   } catch (error) {
//     console.error(
//       "Error registering user:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 5: Create an incident report
//  */
// export async function exampleCreateIncidentReport() {
//   try {
//     const input: ValueTypes["CreateReportInput"] = {
//       title: "Bus Delay on Line 123",
//       description:
//         "Bus is delayed by approximately 15 minutes due to heavy traffic",
//       kind: "TRAFFIC_JAM" as const,
//       lineIds: ["line-123"],
//     };

//     const result = await mutations.createIncidentReport(input);
//     console.log("Incident created:", result.carrierMutations?.createReport);
//     return result.carrierMutations?.createReport;
//   } catch (error) {
//     console.error(
//       "Error creating incident:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 6: Save a draft report
//  */
// export async function exampleSaveDraft() {
//   try {
//     const input: ValueTypes["CreateReportInput"] = {
//       title: "Platform Change",
//       description: "Platform changed for train service",
//       kind: "PLATFORM_CHANGES" as const,
//       status: "DRAFT" as const,
//       lineIds: ["rail-line-45"],
//     };

//     const result = await mutations.saveDraft(input);
//     console.log("Draft saved:", result.carrierMutations?.saveDraft);
//     return result.carrierMutations?.saveDraft;
//   } catch (error) {
//     console.error(
//       "Error saving draft:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 7: Update an existing report
//  */
// export async function exampleUpdateReport(reportId: string) {
//   try {
//     const input: ValueTypes["UpdateReportInput"] = {
//       title: "Updated: Bus Delay on Line 123",
//       description: "Bus delay has been resolved",
//       status: "RESOLVED" as const,
//     };

//     const result = await mutations.updateIncidentReport(reportId, input);
//     console.log("Report updated:", result.carrierMutations?.updateReport);
//     return result.carrierMutations?.updateReport;
//   } catch (error) {
//     console.error(
//       "Error updating report:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 8: Publish a report
//  */
// export async function examplePublishReport(reportId: string) {
//   try {
//     const result = await mutations.publishIncidentReport(reportId);
//     console.log("Report published:", result.carrierMutations?.publishReport);
//     return result.carrierMutations?.publishReport;
//   } catch (error) {
//     console.error(
//       "Error publishing report:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 9: Delete a report
//  */
// export async function exampleDeleteReport(reportId: string) {
//   try {
//     const result = await mutations.deleteIncidentReport(reportId);
//     if (result.carrierMutations?.deleteReport.success) {
//       console.log("Report deleted successfully");
//     }
//     return result.carrierMutations?.deleteReport;
//   } catch (error) {
//     console.error(
//       "Error deleting report:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 10: Check 2FA status
//  */
// export async function exampleCheck2FAStatus(username: string) {
//   try {
//     const result = await queries.check2FAStatus(username);
//     console.log("2FA Status:", result.check2FAStatus);
//     return result.check2FAStatus;
//   } catch (error) {
//     console.error(
//       "Error checking 2FA status:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 11: Setup 2FA
//  */
// export async function exampleSetup2FA() {
//   try {
//     const result = await mutations.setup2FA();
//     console.log("2FA Setup:", {
//       secret: result.setup2FA.secret,
//       qrCode: result.setup2FA.qrCode,
//     });
//     return result.setup2FA;
//   } catch (error) {
//     console.error(
//       "Error setting up 2FA:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 12: Verify 2FA token
//  */
// export async function exampleVerify2FA(token: string, secret: string) {
//   try {
//     const result = await mutations.verify2FA(token, secret);
//     if (result.verify2FA.success) {
//       console.log("2FA verified successfully");
//     } else {
//       console.error("2FA verification failed:", result.verify2FA.message);
//     }
//     return result.verify2FA;
//   } catch (error) {
//     console.error(
//       "Error verifying 2FA:",
//       graphqlClient.handleGraphQLError(error),
//     );
//     throw error;
//   }
// }

// /**
//  * Example 13: Complex query with nested selections using Thunder
//  */
// export async function exampleComplexQuery() {
//   try {
//     const result = await thunderClient("query")({
//       me: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         twoFactorEnabled: true,
//         createdAt: true,
//         updatedAt: true,
//       },
//     });
//     return result;
//   } catch (error) {
//     console.error("Error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 14: Multiple queries in one request
//  */
// export async function exampleMultipleQueries(username: string) {
//   try {
//     const result = await thunderClient("query")({
//       me: {
//         id: true,
//         name: true,
//         email: true,
//       },
//       check2FAStatus: [
//         { username },
//         {
//           requires2FA: true,
//           userExists: true,
//         },
//       ],
//     });
//     return result;
//   } catch (error) {
//     console.error("Error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 15: Using custom selectors for reusable field selections
//  */
// export async function exampleWithSelectors() {
//   try {
//     const result = await thunderClient("query")({
//       me: {
//         __typename: true,
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//         twoFactorEnabled: true,
//         createdAt: true,
//         updatedAt: true,
//       },
//     });

//     console.log("User details:", result.me);
//     return result.me;
//   } catch (error) {
//     console.error("Error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 16: React hook usage
//  */
// export function useGraphQLQuery() {
//   // This is a pattern you can use with React
//   // Import useState, useEffect from 'react' for actual usage

//   const fetchData = async () => {
//     try {
//       const user = await queries.getCurrentUser();
//       console.log("User:", user.me);
//       return user.me;
//     } catch (error) {
//       console.error("Error:", graphqlClient.handleGraphQLError(error));
//       return null;
//     }
//   };

//   return { fetchData };
// }

// /**
//  * Example 17: Server-side usage (in API routes or server components)
//  */
// export async function exampleServerSideUsage() {
//   // This can be used in Next.js API routes or Server Components
//   try {
//     const result = await thunderClient("query")({
//       me: {
//         id: true,
//         name: true,
//         email: true,
//         role: true,
//       },
//     });
//     return result.me;
//   } catch (error) {
//     console.error("Server error:", graphqlClient.handleGraphQLError(error));
//     throw error;
//   }
// }

// /**
//  * Example 18: Handling authentication errors
//  */
// export async function exampleWithAuthHandling() {
//   try {
//     const result = await queries.getCurrentUser();
//     return result.me;
//   } catch (error) {
//     const errorMessage = graphqlClient.handleGraphQLError(error);

//     if (
//       errorMessage.includes("Unauthorized") ||
//       errorMessage.includes("unauthenticated")
//     ) {
//       console.log("User is not authenticated, redirecting to login...");
//       // Handle redirect or show login modal
//       // window.location.href = '/auth/signin';
//     }

//     throw error;
//   }
// }
