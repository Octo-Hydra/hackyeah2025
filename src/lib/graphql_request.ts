// export const DEENRUV_HOST = `https://shop.samarite.eu/shop-api/`;
const HOST = "/api/graphql";
import { Chain } from "./fetch";
import { scalars } from "./scalars";
// import { buildURL } from "../utils";

export const Query = (options?: { headers?: Record<string, string> }) => {
  return Chain(HOST, {
    headers: {
      ...(options?.headers ?? {}),
    },
  })("query", { scalars });
};

export const Mutation = (options?: { headers?: Record<string, string> }) => {
  return Chain(HOST, {
    headers: {
      ...(options?.headers ?? {}),
    },
  })("mutation", { scalars });
};
