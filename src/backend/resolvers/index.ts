import Query from "./query";
import Mutation from "./mutation";
import carrierMutation from "./carrierMutation";
import UserQuery from "./userQuery";
import { subscriptionResolvers } from "./subscriptions";

const resolvers = {
  Query,
  Mutation,
  carrierMutation,
  UserQuery,
  ...subscriptionResolvers,
};

export default resolvers;
