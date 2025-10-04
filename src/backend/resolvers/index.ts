import Query from "./query.js";
import Mutation from "./mutation.js";
import { subscriptionResolvers } from "./subscriptions.js";
import Incident from "./incidentResolvers.js";

const resolvers = {
  Query,
  Mutation,
  Incident,
  ...subscriptionResolvers,
};

export default resolvers;
