import Query from "./query.js";
import Mutation from "./mutation.js";
import { subscriptionResolvers } from "./subscriptions.js";
import Incident from "./incidentResolvers.js";
import Line from "./lineResolvers.js";
import { AdminQueryResolvers } from "./adminQuery.js";
import { AdminMutationResolvers } from "./adminMutation.js";
import { adminAnalyticsResolvers } from "./adminAnalytics.js";
import { optimalJourneyResolver } from "./optimalJourneyResolver.js";
import { submitIncidentReport } from "./incidentMutations.js";
import {
  canSubmitReport,
  myPendingIncidents,
  moderatorQueue,
} from "./incidentQueries.js";
import { ModeratorMutationResolvers } from "./moderatorMutations.js";

const resolvers = {
  Query: {
    ...Query,
    ...AdminQueryResolvers.Query,
    ...optimalJourneyResolver.Query,
    canSubmitReport,
    myPendingIncidents,
    moderatorQueue,
  },
  Mutation: {
    ...Mutation,
    ...AdminMutationResolvers.Mutation,
    ...ModeratorMutationResolvers.Mutation,
    submitIncidentReport,
  },
  AdminQuery: {
    ...AdminQueryResolvers.AdminQuery,
    ...adminAnalyticsResolvers.AdminQuery,
  },
  AdminMutation: AdminMutationResolvers.AdminMutation,
  ModeratorMutation: ModeratorMutationResolvers.ModeratorMutation,
  UserReputationChange: ModeratorMutationResolvers.UserReputationChange,
  Incident,
  Line,
  ...subscriptionResolvers,
};

export default resolvers;
