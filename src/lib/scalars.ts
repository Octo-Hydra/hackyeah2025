// import { FromSelector, GraphQLTypes, ZeusScalars } from "./zeus";

import { FromSelector, GraphQLTypes, ZeusScalars } from "@/zeus";

export const scalars = ZeusScalars({
  ID: {
    decode: (e: unknown) => e as string,
    encode: (e: unknown) => e as string,
  },
});

export type ScalarsType = typeof scalars;

export type FromSelectorWithScalars<
  SELECTOR,
  NAME extends keyof GraphQLTypes,
> = FromSelector<SELECTOR, NAME, ScalarsType>;
