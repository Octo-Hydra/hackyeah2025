import Query from "./query";
import Mutation from "./mutation";
import carrierMutation from "./carrierMutation";
import UserQuery from "./userQuery";
import userMutation from "./userMutation";
import { subscriptionResolvers } from "./subscriptions";

const resolvers = {
  Query,
  Mutation,
  carrierMutation,
  userMutation,
  UserQuery,
  ...subscriptionResolvers,
};

export default resolvers;
