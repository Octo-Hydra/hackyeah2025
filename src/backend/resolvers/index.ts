import Query from "./query.js";
import Mutation from "./mutation.js";
import { subscriptionResolvers } from "./subscriptions.js";
import Incident from "./incidentResolvers.js";
import { AdminQueryResolvers } from "./adminQuery.js";
import { AdminMutationResolvers } from "./adminMutation.js";
import { adminAnalyticsResolvers } from "./adminAnalytics.js";

const resolvers = {
  Query: {
    ...Query,
    ...AdminQueryResolvers.Query,
  },
  Mutation: {
    ...Mutation,
    ...AdminMutationResolvers.Mutation,
  },
  AdminQuery: {
    ...AdminQueryResolvers.AdminQuery,
    ...adminAnalyticsResolvers.AdminQuery,
  },
  AdminMutation: AdminMutationResolvers.AdminMutation,
  Incident,
  ...subscriptionResolvers,
};

export default resolvers;
