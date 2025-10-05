import Query from "./query.js";
import Mutation from "./mutation.js";
import { subscriptionResolvers } from "./subscriptions.js";
import Incident from "./incidentResolvers.js";
import Line from "./lineResolvers.js";
import { AdminQueryResolvers } from "./adminQuery.js";
import { AdminMutationResolvers } from "./adminMutation.js";
import { adminAnalyticsResolvers } from "./adminAnalytics.js";
import { optimalJourneyResolver } from "./optimalJourneyResolver.js";

const resolvers = {
  Query: {
    ...Query,
    ...AdminQueryResolvers.Query,
    ...optimalJourneyResolver.Query,
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
  Line,
  ...subscriptionResolvers,
};

export default resolvers;
