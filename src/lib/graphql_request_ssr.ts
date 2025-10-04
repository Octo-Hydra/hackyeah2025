// export const DEENRUV_HOST = `https://shop.samarite.eu/shop-api/`;
export const HOST = `${process.env.NEXTAUTH_URL}/api/graphql`;

import { Chain } from "./fetch";
import { scalars } from "./scalars";
// import { buildURL } from "../utils";

export const prepareSSRquery = async (options?: {
  next?: { tags?: string[]; revalidate?: number };
  headers?: Record<string, string>;
}) => {
  return {
    querySSR: Chain(HOST, {
      headers: {
        ...(options?.headers ?? {}),
      },
      ...(options?.next && { next: options.next }),
    })("query", { scalars }),
  };
};

export const Mutation = async (options?: {
  headers?: Record<string, string>;
}) => {
  return Chain(HOST, {
    headers: {
      ...(options?.headers ?? {}),
    },
  })("mutation", { scalars });
};
