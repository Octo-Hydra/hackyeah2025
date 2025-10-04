import Query from "./query.js";
import Mutation from "./mutation.js";
import { subscriptionResolvers } from "./subscriptions.js";

const resolvers = {
  Query,
  Mutation,
  ...subscriptionResolvers,
};

export default resolvers;
