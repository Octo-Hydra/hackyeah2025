/* eslint-disable */

import { AllTypesProps, ReturnTypes, Ops } from './const';


export const HOST="Specify host"


export const HEADERS = {}
export const apiSubscription = (options: chainOptions) => (query: string) => {
  try {
    const queryString = options[0] + '?query=' + encodeURIComponent(query);
    const wsString = queryString.replace('http', 'ws');
    const host = (options.length > 1 && options[1]?.websocket?.[0]) || wsString;
    const webSocketOptions = options[1]?.websocket || [host];
    const ws = new WebSocket(...webSocketOptions);
    return {
      ws,
      on: (e: (args: any) => void) => {
        ws.onmessage = (event: any) => {
          if (event.data) {
            const parsed = JSON.parse(event.data);
            const data = parsed.data;
            return e(data);
          }
        };
      },
      off: (e: (args: any) => void) => {
        ws.onclose = e;
      },
      error: (e: (args: any) => void) => {
        ws.onerror = e;
      },
      open: (e: () => void) => {
        ws.onopen = e;
      },
    };
  } catch {
    throw new Error('No websockets implemented');
  }
};
const handleFetchResponse = (response: Response): Promise<GraphQLResponse> => {
  if (!response.ok) {
    return new Promise((_, reject) => {
      response
        .text()
        .then((text) => {
          try {
            reject(JSON.parse(text));
          } catch (err) {
            reject(text);
          }
        })
        .catch(reject);
    });
  }
  return response.json() as Promise<GraphQLResponse>;
};

export const apiFetch =
  (options: fetchOptions) =>
  (query: string, variables: Record<string, unknown> = {}) => {
    const fetchOptions = options[1] || {};
    if (fetchOptions.method && fetchOptions.method === 'GET') {
      return fetch(`${options[0]}?query=${encodeURIComponent(query)}`, fetchOptions)
        .then(handleFetchResponse)
        .then((response: GraphQLResponse) => {
          if (response.errors) {
            throw new GraphQLError(response);
          }
          return response.data;
        });
    }
    return fetch(`${options[0]}`, {
      body: JSON.stringify({ query, variables }),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      ...fetchOptions,
    })
      .then(handleFetchResponse)
      .then((response: GraphQLResponse) => {
        if (response.errors) {
          throw new GraphQLError(response);
        }
        return response.data;
      });
  };

export const InternalsBuildQuery = ({
  ops,
  props,
  returns,
  options,
  scalars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  options?: OperationOptions;
  scalars?: ScalarDefinition;
}) => {
  const ibb = (
    k: string,
    o: InputValueType | VType,
    p = '',
    root = true,
    vars: Array<{ name: string; graphQLType: string }> = [],
  ): string => {
    const keyForPath = purifyGraphQLKey(k);
    const newPath = [p, keyForPath].join(SEPARATOR);
    if (!o) {
      return '';
    }
    if (typeof o === 'boolean' || typeof o === 'number') {
      return k;
    }
    if (typeof o === 'string') {
      return `${k} ${o}`;
    }
    if (Array.isArray(o)) {
      const args = InternalArgsBuilt({
        props,
        returns,
        ops,
        scalars,
        vars,
      })(o[0], newPath);
      return `${ibb(args ? `${k}(${args})` : k, o[1], p, false, vars)}`;
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(`${alias}:${operationName}`, operation, p, false, vars);
        })
        .join('\n');
    }
    const hasOperationName = root && options?.operationName ? ' ' + options.operationName : '';
    const keyForDirectives = o.__directives ?? '';
    const query = `{${Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map((e) => ibb(...e, [p, `field<>${keyForPath}`].join(SEPARATOR), false, vars))
      .join('\n')}}`;
    if (!root) {
      return `${k} ${keyForDirectives}${hasOperationName} ${query}`;
    }
    const varsString = vars.map((v) => `${v.name}: ${v.graphQLType}`).join(', ');
    return `${k} ${keyForDirectives}${hasOperationName}${varsString ? `(${varsString})` : ''} ${query}`;
  };
  return ibb;
};

type UnionOverrideKeys<T, U> = Omit<T, keyof U> & U;

export const Thunder =
  <SCLR extends ScalarDefinition>(fn: FetchFunction, thunderGraphQLOptions?: ThunderGraphQLOptions<SCLR>) =>
  <O extends keyof typeof Ops, OVERRIDESCLR extends SCLR, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<OVERRIDESCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: Z & {
      [P in keyof Z]: P extends keyof ValueTypes[R] ? Z[P] : never;
    },
    ops?: OperationOptions & { variables?: Record<string, unknown> },
  ) => {
    const options = {
      ...thunderGraphQLOptions,
      ...graphqlOptions,
    };
    return fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: options?.scalars,
      }),
      ops?.variables,
    ).then((data) => {
      if (options?.scalars) {
        return decodeScalarsInResponse({
          response: data,
          initialOp: operation,
          initialZeusQuery: o as VType,
          returns: ReturnTypes,
          scalars: options.scalars,
          ops: Ops,
        });
      }
      return data;
    }) as Promise<InputType<GraphQLTypes[R], Z, UnionOverrideKeys<SCLR, OVERRIDESCLR>>>;
  };

export const Chain = (...options: chainOptions) => Thunder(apiFetch(options));

export const SubscriptionThunder =
  <SCLR extends ScalarDefinition>(fn: SubscriptionFunction, thunderGraphQLOptions?: ThunderGraphQLOptions<SCLR>) =>
  <O extends keyof typeof Ops, OVERRIDESCLR extends SCLR, R extends keyof ValueTypes = GenericOperation<O>>(
    operation: O,
    graphqlOptions?: ThunderGraphQLOptions<OVERRIDESCLR>,
  ) =>
  <Z extends ValueTypes[R]>(
    o: Z & {
      [P in keyof Z]: P extends keyof ValueTypes[R] ? Z[P] : never;
    },
    ops?: OperationOptions & { variables?: ExtractVariables<Z> },
  ) => {
    const options = {
      ...thunderGraphQLOptions,
      ...graphqlOptions,
    };
    type CombinedSCLR = UnionOverrideKeys<SCLR, OVERRIDESCLR>;
    const returnedFunction = fn(
      Zeus(operation, o, {
        operationOptions: ops,
        scalars: options?.scalars,
      }),
    ) as SubscriptionToGraphQL<Z, GraphQLTypes[R], CombinedSCLR>;
    if (returnedFunction?.on && options?.scalars) {
      const wrapped = returnedFunction.on;
      returnedFunction.on = (fnToCall: (args: InputType<GraphQLTypes[R], Z, CombinedSCLR>) => void) =>
        wrapped((data: InputType<GraphQLTypes[R], Z, CombinedSCLR>) => {
          if (options?.scalars) {
            return fnToCall(
              decodeScalarsInResponse({
                response: data,
                initialOp: operation,
                initialZeusQuery: o as VType,
                returns: ReturnTypes,
                scalars: options.scalars,
                ops: Ops,
              }),
            );
          }
          return fnToCall(data);
        });
    }
    return returnedFunction;
  };

export const Subscription = (...options: chainOptions) => SubscriptionThunder(apiSubscription(options));
export const Zeus = <
  Z extends ValueTypes[R],
  O extends keyof typeof Ops,
  R extends keyof ValueTypes = GenericOperation<O>,
>(
  operation: O,
  o: Z,
  ops?: {
    operationOptions?: OperationOptions;
    scalars?: ScalarDefinition;
  },
) =>
  InternalsBuildQuery({
    props: AllTypesProps,
    returns: ReturnTypes,
    ops: Ops,
    options: ops?.operationOptions,
    scalars: ops?.scalars,
  })(operation, o as VType);

export const ZeusSelect = <T>() => ((t: unknown) => t) as SelectionFunction<T>;

export const Selector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();

export const TypeFromSelector = <T extends keyof ValueTypes>(key: T) => key && ZeusSelect<ValueTypes[T]>();
export const Gql = Chain(HOST, {
  headers: {
    'Content-Type': 'application/json',
    ...HEADERS,
  },
});

export const ZeusScalars = ZeusSelect<ScalarCoders>();

type BaseSymbol = number | string | undefined | boolean | null;

type ScalarsSelector<T, V> = {
  [X in Required<{
    [P in keyof T]: P extends keyof V
      ? V[P] extends Array<any> | undefined
        ? never
        : T[P] extends BaseSymbol | Array<BaseSymbol>
        ? P
        : never
      : never;
  }>[keyof T]]: true;
};

export const fields = <T extends keyof ModelTypes>(k: T) => {
  const t = ReturnTypes[k];
  const fnType = k in AllTypesProps ? AllTypesProps[k as keyof typeof AllTypesProps] : undefined;
  const hasFnTypes = typeof fnType === 'object' ? fnType : undefined;
  const o = Object.fromEntries(
    Object.entries(t)
      .filter(([k, value]) => {
        const isFunctionType = hasFnTypes && k in hasFnTypes && !!hasFnTypes[k as keyof typeof hasFnTypes];
        if (isFunctionType) return false;
        const isReturnType = ReturnTypes[value as string];
        if (!isReturnType) return true;
        if (typeof isReturnType !== 'string') return false;
        if (isReturnType.startsWith('scalar.')) {
          return true;
        }
        return false;
      })
      .map(([key]) => [key, true as const]),
  );
  return o as ScalarsSelector<ModelTypes[T], T extends keyof ValueTypes ? ValueTypes[T] : never>;
};

export const decodeScalarsInResponse = <O extends Operations>({
  response,
  scalars,
  returns,
  ops,
  initialZeusQuery,
  initialOp,
}: {
  ops: O;
  response: any;
  returns: ReturnTypesType;
  scalars?: Record<string, ScalarResolver | undefined>;
  initialOp: keyof O;
  initialZeusQuery: InputValueType | VType;
}) => {
  if (!scalars) {
    return response;
  }
  const builder = PrepareScalarPaths({
    ops,
    returns,
  });

  const scalarPaths = builder(initialOp as string, ops[initialOp], initialZeusQuery);
  if (scalarPaths) {
    const r = traverseResponse({ scalarPaths, resolvers: scalars })(initialOp as string, response, [ops[initialOp]]);
    return r;
  }
  return response;
};

export const traverseResponse = ({
  resolvers,
  scalarPaths,
}: {
  scalarPaths: { [x: string]: `scalar.${string}` };
  resolvers: {
    [x: string]: ScalarResolver | undefined;
  };
}) => {
  const ibb = (k: string, o: InputValueType | VType, p: string[] = []): unknown => {
    if (Array.isArray(o)) {
      return o.map((eachO) => ibb(k, eachO, p));
    }
    if (o == null) {
      return o;
    }
    const scalarPathString = p.join(SEPARATOR);
    const currentScalarString = scalarPaths[scalarPathString];
    if (currentScalarString) {
      const currentDecoder = resolvers[currentScalarString.split('.')[1]]?.decode;
      if (currentDecoder) {
        return currentDecoder(o);
      }
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string' || !o) {
      return o;
    }
    const entries = Object.entries(o).map(([k, v]) => [k, ibb(k, v, [...p, purifyGraphQLKey(k)])] as const);
    const objectFromEntries = entries.reduce<Record<string, unknown>>((a, [k, v]) => {
      a[k] = v;
      return a;
    }, {});
    return objectFromEntries;
  };
  return ibb;
};

export type AllTypesPropsType = {
  [x: string]:
    | undefined
    | `scalar.${string}`
    | 'enum'
    | {
        [x: string]:
          | undefined
          | string
          | {
              [x: string]: string | undefined;
            };
      };
};

export type ReturnTypesType = {
  [x: string]:
    | {
        [x: string]: string | undefined;
      }
    | `scalar.${string}`
    | undefined;
};
export type InputValueType = {
  [x: string]: undefined | boolean | string | number | [any, undefined | boolean | InputValueType] | InputValueType;
};
export type VType =
  | undefined
  | boolean
  | string
  | number
  | [any, undefined | boolean | InputValueType]
  | InputValueType;

export type PlainType = boolean | number | string | null | undefined;
export type ZeusArgsType =
  | PlainType
  | {
      [x: string]: ZeusArgsType;
    }
  | Array<ZeusArgsType>;

export type Operations = Record<string, string>;

export type VariableDefinition = {
  [x: string]: unknown;
};

export const SEPARATOR = '|';

export type fetchOptions = Parameters<typeof fetch>;
type websocketOptions = typeof WebSocket extends new (...args: infer R) => WebSocket ? R : never;
export type chainOptions = [fetchOptions[0], fetchOptions[1] & { websocket?: websocketOptions }] | [fetchOptions[0]];
export type FetchFunction = (query: string, variables?: Record<string, unknown>) => Promise<any>;
export type SubscriptionFunction = (query: string) => any;
type NotUndefined<T> = T extends undefined ? never : T;
export type ResolverType<F> = NotUndefined<F extends [infer ARGS, any] ? ARGS : undefined>;

export type OperationOptions = {
  operationName?: string;
};

export type ScalarCoder = Record<string, (s: unknown) => string>;

export interface GraphQLResponse {
  data?: Record<string, any>;
  errors?: Array<{
    message: string;
  }>;
}
export class GraphQLError extends Error {
  constructor(public response: GraphQLResponse) {
    super('');
    console.error(response);
  }
  toString() {
    return 'GraphQL Response Error';
  }
}
export type GenericOperation<O> = O extends keyof typeof Ops ? typeof Ops[O] : never;
export type ThunderGraphQLOptions<SCLR extends ScalarDefinition> = {
  scalars?: SCLR | ScalarCoders;
};

const ExtractScalar = (mappedParts: string[], returns: ReturnTypesType): `scalar.${string}` | undefined => {
  if (mappedParts.length === 0) {
    return;
  }
  const oKey = mappedParts[0];
  const returnP1 = returns[oKey];
  if (typeof returnP1 === 'object') {
    const returnP2 = returnP1[mappedParts[1]];
    if (returnP2) {
      return ExtractScalar([returnP2, ...mappedParts.slice(2)], returns);
    }
    return undefined;
  }
  return returnP1 as `scalar.${string}` | undefined;
};

export const PrepareScalarPaths = ({ ops, returns }: { returns: ReturnTypesType; ops: Operations }) => {
  const ibb = (
    k: string,
    originalKey: string,
    o: InputValueType | VType,
    p: string[] = [],
    pOriginals: string[] = [],
    root = true,
  ): { [x: string]: `scalar.${string}` } | undefined => {
    if (!o) {
      return;
    }
    if (typeof o === 'boolean' || typeof o === 'number' || typeof o === 'string') {
      const extractionArray = [...pOriginals, originalKey];
      const isScalar = ExtractScalar(extractionArray, returns);
      if (isScalar?.startsWith('scalar')) {
        const partOfTree = {
          [[...p, k].join(SEPARATOR)]: isScalar,
        };
        return partOfTree;
      }
      return {};
    }
    if (Array.isArray(o)) {
      return ibb(k, k, o[1], p, pOriginals, false);
    }
    if (k === '__alias') {
      return Object.entries(o)
        .map(([alias, objectUnderAlias]) => {
          if (typeof objectUnderAlias !== 'object' || Array.isArray(objectUnderAlias)) {
            throw new Error(
              'Invalid alias it should be __alias:{ YOUR_ALIAS_NAME: { OPERATION_NAME: { ...selectors }}}',
            );
          }
          const operationName = Object.keys(objectUnderAlias)[0];
          const operation = objectUnderAlias[operationName];
          return ibb(alias, operationName, operation, p, pOriginals, false);
        })
        .reduce((a, b) => ({
          ...a,
          ...b,
        }));
    }
    const keyName = root ? ops[k] : k;
    return Object.entries(o)
      .filter(([k]) => k !== '__directives')
      .map(([k, v]) => {
        // Inline fragments shouldn't be added to the path as they aren't a field
        const isInlineFragment = originalKey.match(/^...\s*on/) != null;
        return ibb(
          k,
          k,
          v,
          isInlineFragment ? p : [...p, purifyGraphQLKey(keyName || k)],
          isInlineFragment ? pOriginals : [...pOriginals, purifyGraphQLKey(originalKey)],
          false,
        );
      })
      .reduce((a, b) => ({
        ...a,
        ...b,
      }));
  };
  return ibb;
};

export const purifyGraphQLKey = (k: string) => k.replace(/\([^)]*\)/g, '').replace(/^[^:]*\:/g, '');

const mapPart = (p: string) => {
  const [isArg, isField] = p.split('<>');
  if (isField) {
    return {
      v: isField,
      __type: 'field',
    } as const;
  }
  return {
    v: isArg,
    __type: 'arg',
  } as const;
};

type Part = ReturnType<typeof mapPart>;

export const ResolveFromPath = (props: AllTypesPropsType, returns: ReturnTypesType, ops: Operations) => {
  const ResolvePropsType = (mappedParts: Part[]) => {
    const oKey = ops[mappedParts[0].v];
    const propsP1 = oKey ? props[oKey] : props[mappedParts[0].v];
    if (propsP1 === 'enum' && mappedParts.length === 1) {
      return 'enum';
    }
    if (typeof propsP1 === 'string' && propsP1.startsWith('scalar.') && mappedParts.length === 1) {
      return propsP1;
    }
    if (typeof propsP1 === 'object') {
      if (mappedParts.length < 2) {
        return 'not';
      }
      const propsP2 = propsP1[mappedParts[1].v];
      if (typeof propsP2 === 'string') {
        return rpp(
          `${propsP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
      if (typeof propsP2 === 'object') {
        if (mappedParts.length < 3) {
          return 'not';
        }
        const propsP3 = propsP2[mappedParts[2].v];
        if (propsP3 && mappedParts[2].__type === 'arg') {
          return rpp(
            `${propsP3}${SEPARATOR}${mappedParts
              .slice(3)
              .map((mp) => mp.v)
              .join(SEPARATOR)}`,
          );
        }
      }
    }
  };
  const ResolveReturnType = (mappedParts: Part[]) => {
    if (mappedParts.length === 0) {
      return 'not';
    }
    const oKey = ops[mappedParts[0].v];
    const returnP1 = oKey ? returns[oKey] : returns[mappedParts[0].v];
    if (typeof returnP1 === 'object') {
      if (mappedParts.length < 2) return 'not';
      const returnP2 = returnP1[mappedParts[1].v];
      if (returnP2) {
        return rpp(
          `${returnP2}${SEPARATOR}${mappedParts
            .slice(2)
            .map((mp) => mp.v)
            .join(SEPARATOR)}`,
        );
      }
    }
  };
  const rpp = (path: string): 'enum' | 'not' | `scalar.${string}` => {
    const parts = path.split(SEPARATOR).filter((l) => l.length > 0);
    const mappedParts = parts.map(mapPart);
    const propsP1 = ResolvePropsType(mappedParts);
    if (propsP1) {
      return propsP1;
    }
    const returnP1 = ResolveReturnType(mappedParts);
    if (returnP1) {
      return returnP1;
    }
    return 'not';
  };
  return rpp;
};

export const InternalArgsBuilt = ({
  props,
  ops,
  returns,
  scalars,
  vars,
}: {
  props: AllTypesPropsType;
  returns: ReturnTypesType;
  ops: Operations;
  scalars?: ScalarDefinition;
  vars: Array<{ name: string; graphQLType: string }>;
}) => {
  const arb = (a: ZeusArgsType, p = '', root = true): string => {
    if (typeof a === 'string') {
      if (a.startsWith(START_VAR_NAME)) {
        const [varName, graphQLType] = a.replace(START_VAR_NAME, '$').split(GRAPHQL_TYPE_SEPARATOR);
        const v = vars.find((v) => v.name === varName);
        if (!v) {
          vars.push({
            name: varName,
            graphQLType,
          });
        } else {
          if (v.graphQLType !== graphQLType) {
            throw new Error(
              `Invalid variable exists with two different GraphQL Types, "${v.graphQLType}" and ${graphQLType}`,
            );
          }
        }
        return varName;
      }
    }
    const checkType = ResolveFromPath(props, returns, ops)(p);
    if (checkType.startsWith('scalar.')) {
       
      const [_, ...splittedScalar] = checkType.split('.');
      const scalarKey = splittedScalar.join('.');
      return (scalars?.[scalarKey]?.encode?.(a) as string) || JSON.stringify(a);
    }
    if (Array.isArray(a)) {
      return `[${a.map((arr) => arb(arr, p, false)).join(', ')}]`;
    }
    if (typeof a === 'string') {
      if (checkType === 'enum') {
        return a;
      }
      return `${JSON.stringify(a)}`;
    }
    if (typeof a === 'object') {
      if (a === null) {
        return `null`;
      }
      const returnedObjectString = Object.entries(a)
        .filter(([, v]) => typeof v !== 'undefined')
        .map(([k, v]) => `${k}: ${arb(v, [p, k].join(SEPARATOR), false)}`)
        .join(',\n');
      if (!root) {
        return `{${returnedObjectString}}`;
      }
      return returnedObjectString;
    }
    return `${a}`;
  };
  return arb;
};

export const resolverFor = <X, T extends keyof ResolverInputTypes, Z extends keyof ResolverInputTypes[T]>(
  _type: T,
  _field: Z,
  fn: (
    args: Required<ResolverInputTypes[T]>[Z] extends [infer Input, any] ? Input : any,
    source: any,
  ) => Z extends keyof ModelTypes[T] ? ModelTypes[T][Z] | Promise<ModelTypes[T][Z]> | X : never,
) => fn as (args?: any, source?: any) => ReturnType<typeof fn>;

export type UnwrapPromise<T> = T extends Promise<infer R> ? R : T;
export type ZeusState<T extends (...args: any[]) => Promise<any>> = NonNullable<UnwrapPromise<ReturnType<T>>>;
export type ZeusHook<
  T extends (...args: any[]) => Record<string, (...args: any[]) => Promise<any>>,
  N extends keyof ReturnType<T>,
> = ZeusState<ReturnType<T>[N]>;

export type WithTypeNameValue<T> = T & {
  __typename?: boolean;
  __directives?: string;
};
export type AliasType<T> = WithTypeNameValue<T> & {
  __alias?: Record<string, WithTypeNameValue<T>>;
};
type DeepAnify<T> = {
  [P in keyof T]?: any;
};
type IsPayLoad<T> = T extends [any, infer PayLoad] ? PayLoad : T;
export type ScalarDefinition = Record<string, ScalarResolver>;

type IsScalar<S, SCLR extends ScalarDefinition> = S extends 'scalar' & { name: infer T }
  ? T extends keyof SCLR
    ? SCLR[T]['decode'] extends (s: unknown) => unknown
      ? ReturnType<SCLR[T]['decode']>
      : unknown
    : unknown
  : S extends Array<infer R>
  ? Array<IsScalar<R, SCLR>>
  : S;

type IsArray<T, U, SCLR extends ScalarDefinition> = T extends Array<infer R>
  ? InputType<R, U, SCLR>[]
  : InputType<T, U, SCLR>;
type FlattenArray<T> = T extends Array<infer R> ? R : T;
type BaseZeusResolver = boolean | 1 | string | Variable<any, string>;

type IsInterfaced<SRC extends DeepAnify<DST>, DST, SCLR extends ScalarDefinition> = FlattenArray<SRC> extends
  | ZEUS_INTERFACES
  | ZEUS_UNIONS
  ? {
      [P in keyof SRC]: SRC[P] extends '__union' & infer R
        ? P extends keyof DST
          ? IsArray<R, '__typename' extends keyof DST ? DST[P] & { __typename: true } : DST[P], SCLR>
          : IsArray<R, '__typename' extends keyof DST ? { __typename: true } : Record<string, never>, SCLR>
        : never;
    }[keyof SRC] & {
      [P in keyof Omit<
        Pick<
          SRC,
          {
            [P in keyof DST]: SRC[P] extends '__union' & infer _R ? never : P;
          }[keyof DST]
        >,
        '__typename'
      >]: IsPayLoad<DST[P]> extends BaseZeusResolver ? IsScalar<SRC[P], SCLR> : IsArray<SRC[P], DST[P], SCLR>;
    }
  : {
      [P in keyof Pick<SRC, keyof DST>]: IsPayLoad<DST[P]> extends BaseZeusResolver
        ? IsScalar<SRC[P], SCLR>
        : IsArray<SRC[P], DST[P], SCLR>;
    };

export type MapType<SRC, DST, SCLR extends ScalarDefinition> = SRC extends DeepAnify<DST>
  ? IsInterfaced<SRC, DST, SCLR>
  : never;
// eslint-disable-next-line @typescript-eslint/ban-types
export type InputType<SRC, DST, SCLR extends ScalarDefinition = {}> = IsPayLoad<DST> extends { __alias: infer R }
  ? {
      [P in keyof R]: MapType<SRC, R[P], SCLR>[keyof MapType<SRC, R[P], SCLR>];
    } & MapType<SRC, Omit<IsPayLoad<DST>, '__alias'>, SCLR>
  : MapType<SRC, IsPayLoad<DST>, SCLR>;
export type SubscriptionToGraphQL<Z, T, SCLR extends ScalarDefinition> = {
  ws: WebSocket;
  on: (fn: (args: InputType<T, Z, SCLR>) => void) => void;
  off: (fn: (e: { data?: InputType<T, Z, SCLR>; code?: number; reason?: string; message?: string }) => void) => void;
  error: (fn: (e: { data?: InputType<T, Z, SCLR>; errors?: string[] }) => void) => void;
  open: () => void;
};

// eslint-disable-next-line @typescript-eslint/ban-types
export type FromSelector<SELECTOR, NAME extends keyof GraphQLTypes, SCLR extends ScalarDefinition = {}> = InputType<
  GraphQLTypes[NAME],
  SELECTOR,
  SCLR
>;

export type ScalarResolver = {
  encode?: (s: unknown) => string;
  decode?: (s: unknown) => unknown;
};

export type SelectionFunction<V> = <Z extends V>(
  t: Z & {
    [P in keyof Z]: P extends keyof V ? Z[P] : never;
  },
) => Z;

type BuiltInVariableTypes = {
  ['String']: string;
  ['Int']: number;
  ['Float']: number;
  ['Boolean']: boolean;
};
type AllVariableTypes = keyof BuiltInVariableTypes | keyof ZEUS_VARIABLES;
type VariableRequired<T extends string> = `${T}!` | T | `[${T}]` | `[${T}]!` | `[${T}!]` | `[${T}!]!`;
type VR<T extends string> = VariableRequired<VariableRequired<T>>;

export type GraphQLVariableType = VR<AllVariableTypes>;

type ExtractVariableTypeString<T extends string> = T extends VR<infer R1>
  ? R1 extends VR<infer R2>
    ? R2 extends VR<infer R3>
      ? R3 extends VR<infer R4>
        ? R4 extends VR<infer R5>
          ? R5
          : R4
        : R3
      : R2
    : R1
  : T;

type DecomposeType<T, Type> = T extends `[${infer R}]`
  ? Array<DecomposeType<R, Type>> | undefined
  : T extends `${infer R}!`
  ? NonNullable<DecomposeType<R, Type>>
  : Type | undefined;

type ExtractTypeFromGraphQLType<T extends string> = T extends keyof ZEUS_VARIABLES
  ? ZEUS_VARIABLES[T]
  : T extends keyof BuiltInVariableTypes
  ? BuiltInVariableTypes[T]
  : any;

export type GetVariableType<T extends string> = DecomposeType<
  T,
  ExtractTypeFromGraphQLType<ExtractVariableTypeString<T>>
>;

type UndefinedKeys<T> = {
  [K in keyof T]-?: T[K] extends NonNullable<T[K]> ? never : K;
}[keyof T];

type WithNullableKeys<T> = Pick<T, UndefinedKeys<T>>;
type WithNonNullableKeys<T> = Omit<T, UndefinedKeys<T>>;

type OptionalKeys<T> = {
  [P in keyof T]?: T[P];
};

export type WithOptionalNullables<T> = OptionalKeys<WithNullableKeys<T>> & WithNonNullableKeys<T>;

export type ComposableSelector<T extends keyof ValueTypes> = ReturnType<SelectionFunction<ValueTypes[T]>>;

export type Variable<T extends GraphQLVariableType, Name extends string> = {
  ' __zeus_name': Name;
  ' __zeus_type': T;
};

export type ExtractVariablesDeep<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariablesDeep<Query[K]>> }[keyof Query]>;

export type ExtractVariables<Query> = Query extends Variable<infer VType, infer VName>
  ? { [key in VName]: GetVariableType<VType> }
  : Query extends [infer Inputs, infer Outputs]
  ? ExtractVariablesDeep<Inputs> & ExtractVariables<Outputs>
  : Query extends string | number | boolean | Array<string | number | boolean>
  ? // eslint-disable-next-line @typescript-eslint/ban-types
    {}
  : UnionToIntersection<{ [K in keyof Query]: WithOptionalNullables<ExtractVariables<Query[K]>> }[keyof Query]>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

export const START_VAR_NAME = `$ZEUS_VAR`;
export const GRAPHQL_TYPE_SEPARATOR = `__$GRAPHQL__`;

export const $ = <Type extends GraphQLVariableType, Name extends string>(name: Name, graphqlType: Type) => {
  return (START_VAR_NAME + name + GRAPHQL_TYPE_SEPARATOR + graphqlType) as unknown as Variable<Type, Name>;
};
type ZEUS_INTERFACES = never
export type ScalarCoders = {
	ID?: ScalarResolver;
}
type ZEUS_UNIONS = never

export type ValueTypes = {
    ["UserRole"]:UserRole;
	["User"]: AliasType<{
	id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	twoFactorEnabled?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on User']?: Omit<ValueTypes["User"], "...on User">
}>;
	["TwoFactorSetup"]: AliasType<{
	secret?:boolean | `@${string}`,
	qrCode?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on TwoFactorSetup']?: Omit<ValueTypes["TwoFactorSetup"], "...on TwoFactorSetup">
}>;
	["TwoFactorStatus"]: AliasType<{
	requires2FA?:boolean | `@${string}`,
	userExists?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on TwoFactorStatus']?: Omit<ValueTypes["TwoFactorStatus"], "...on TwoFactorStatus">
}>;
	["TwoFactorResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on TwoFactorResult']?: Omit<ValueTypes["TwoFactorResult"], "...on TwoFactorResult">
}>;
	["Query"]: AliasType<{
	me?:ValueTypes["User"],
check2FAStatus?: [{	username: string | Variable<any, string>},ValueTypes["TwoFactorStatus"]],
	userQuery?:ValueTypes["UserQuery"],
		__typename?: boolean | `@${string}`,
	['...on Query']?: Omit<ValueTypes["Query"], "...on Query">
}>;
	["RegisterInput"]: {
	name: string | Variable<any, string>,
	email: string | Variable<any, string>,
	password: string | Variable<any, string>
};
	["RegisterResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
	userId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on RegisterResult']?: Omit<ValueTypes["RegisterResult"], "...on RegisterResult">
}>;
	["VerifyEmailResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on VerifyEmailResult']?: Omit<ValueTypes["VerifyEmailResult"], "...on VerifyEmailResult">
}>;
	["ResendVerificationResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on ResendVerificationResult']?: Omit<ValueTypes["ResendVerificationResult"], "...on ResendVerificationResult">
}>;
	["Mutation"]: AliasType<{
register?: [{	input: ValueTypes["RegisterInput"] | Variable<any, string>},ValueTypes["RegisterResult"]],
verifyEmail?: [{	token: string | Variable<any, string>},ValueTypes["VerifyEmailResult"]],
resendVerificationEmail?: [{	email: string | Variable<any, string>},ValueTypes["ResendVerificationResult"]],
	setup2FA?:ValueTypes["TwoFactorSetup"],
verify2FA?: [{	token: string | Variable<any, string>,	secret: string | Variable<any, string>},ValueTypes["TwoFactorResult"]],
	disable2FA?:ValueTypes["TwoFactorResult"],
	carrierMutations?:ValueTypes["carrierMutation"],
		__typename?: boolean | `@${string}`,
	['...on Mutation']?: Omit<ValueTypes["Mutation"], "...on Mutation">
}>;
	["carrierMutation"]: AliasType<{
createReport?: [{	input: ValueTypes["CreateReportInput"] | Variable<any, string>},ValueTypes["Incident"]],
saveDraft?: [{	input: ValueTypes["CreateReportInput"] | Variable<any, string>},ValueTypes["Incident"]],
updateReport?: [{	id: ValueTypes["ID"] | Variable<any, string>,	input: ValueTypes["UpdateReportInput"] | Variable<any, string>},ValueTypes["Incident"]],
deleteReport?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["DeleteResult"]],
publishReport?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
		__typename?: boolean | `@${string}`,
	['...on carrierMutation']?: Omit<ValueTypes["carrierMutation"], "...on carrierMutation">
}>;
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["IncidentClass"]:IncidentClass;
	["ReportStatus"]:ReportStatus;
	["Incident"]: AliasType<{
	id?:boolean | `@${string}`,
	title?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	kind?:boolean | `@${string}`,
	incidentClass?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	lines?:ValueTypes["Line"],
	createdBy?:ValueTypes["User"],
	createdAt?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Incident']?: Omit<ValueTypes["Incident"], "...on Incident">
}>;
	["Line"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Line']?: Omit<ValueTypes["Line"], "...on Line">
}>;
	["CreateReportInput"]: {
	title: string | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	kind: ValueTypes["IncidentKind"] | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>
};
	["UpdateReportInput"]: {
	title?: string | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	kind?: ValueTypes["IncidentKind"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>
};
	["DeleteResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on DeleteResult']?: Omit<ValueTypes["DeleteResult"], "...on DeleteResult">
}>;
	["UserQuery"]: AliasType<{
	dupa?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on UserQuery']?: Omit<ValueTypes["UserQuery"], "...on UserQuery">
}>;
	["Subscription"]: AliasType<{
	_empty?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Subscription']?: Omit<ValueTypes["Subscription"], "...on Subscription">
}>;
	["ID"]:unknown
  }

export type ResolverInputTypes = {
    ["UserRole"]:UserRole;
	["User"]: AliasType<{
	id?:boolean | `@${string}`,
	createdAt?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	twoFactorEnabled?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TwoFactorSetup"]: AliasType<{
	secret?:boolean | `@${string}`,
	qrCode?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TwoFactorStatus"]: AliasType<{
	requires2FA?:boolean | `@${string}`,
	userExists?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TwoFactorResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Query"]: AliasType<{
	me?:ResolverInputTypes["User"],
check2FAStatus?: [{	username: string},ResolverInputTypes["TwoFactorStatus"]],
	userQuery?:ResolverInputTypes["UserQuery"],
		__typename?: boolean | `@${string}`
}>;
	["RegisterInput"]: {
	name: string,
	email: string,
	password: string
};
	["RegisterResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
	userId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["VerifyEmailResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["ResendVerificationResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Mutation"]: AliasType<{
register?: [{	input: ResolverInputTypes["RegisterInput"]},ResolverInputTypes["RegisterResult"]],
verifyEmail?: [{	token: string},ResolverInputTypes["VerifyEmailResult"]],
resendVerificationEmail?: [{	email: string},ResolverInputTypes["ResendVerificationResult"]],
	setup2FA?:ResolverInputTypes["TwoFactorSetup"],
verify2FA?: [{	token: string,	secret: string},ResolverInputTypes["TwoFactorResult"]],
	disable2FA?:ResolverInputTypes["TwoFactorResult"],
	carrierMutations?:ResolverInputTypes["carrierMutation"],
		__typename?: boolean | `@${string}`
}>;
	["carrierMutation"]: AliasType<{
createReport?: [{	input: ResolverInputTypes["CreateReportInput"]},ResolverInputTypes["Incident"]],
saveDraft?: [{	input: ResolverInputTypes["CreateReportInput"]},ResolverInputTypes["Incident"]],
updateReport?: [{	id: ResolverInputTypes["ID"],	input: ResolverInputTypes["UpdateReportInput"]},ResolverInputTypes["Incident"]],
deleteReport?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["DeleteResult"]],
publishReport?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
		__typename?: boolean | `@${string}`
}>;
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["IncidentClass"]:IncidentClass;
	["ReportStatus"]:ReportStatus;
	["Incident"]: AliasType<{
	id?:boolean | `@${string}`,
	title?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	kind?:boolean | `@${string}`,
	incidentClass?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	lines?:ResolverInputTypes["Line"],
	createdBy?:ResolverInputTypes["User"],
	createdAt?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Line"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["CreateReportInput"]: {
	title: string,
	description?: string | undefined | null,
	kind: ResolverInputTypes["IncidentKind"],
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null
};
	["UpdateReportInput"]: {
	title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: ResolverInputTypes["IncidentKind"] | undefined | null,
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null
};
	["DeleteResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserQuery"]: AliasType<{
	dupa?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Subscription"]: AliasType<{
	_empty?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["schema"]: AliasType<{
	query?:ResolverInputTypes["Query"],
	mutation?:ResolverInputTypes["Mutation"],
	subscription?:ResolverInputTypes["Subscription"],
		__typename?: boolean | `@${string}`
}>;
	["ID"]:unknown
  }

export type ModelTypes = {
    ["UserRole"]:UserRole;
	["User"]: {
		id: ModelTypes["ID"],
	createdAt: string,
	updatedAt: string,
	name: string,
	email: string,
	role: ModelTypes["UserRole"],
	twoFactorEnabled: boolean
};
	["TwoFactorSetup"]: {
		secret: string,
	qrCode: string
};
	["TwoFactorStatus"]: {
		requires2FA: boolean,
	userExists: boolean
};
	["TwoFactorResult"]: {
		success: boolean,
	message?: string | undefined | null
};
	["Query"]: {
		me?: ModelTypes["User"] | undefined | null,
	check2FAStatus: ModelTypes["TwoFactorStatus"],
	userQuery?: ModelTypes["UserQuery"] | undefined | null
};
	["RegisterInput"]: {
	name: string,
	email: string,
	password: string
};
	["RegisterResult"]: {
		success: boolean,
	message: string,
	userId?: string | undefined | null
};
	["VerifyEmailResult"]: {
		success: boolean,
	message: string
};
	["ResendVerificationResult"]: {
		success: boolean,
	message: string
};
	["Mutation"]: {
		register: ModelTypes["RegisterResult"],
	verifyEmail: ModelTypes["VerifyEmailResult"],
	resendVerificationEmail: ModelTypes["ResendVerificationResult"],
	setup2FA: ModelTypes["TwoFactorSetup"],
	verify2FA: ModelTypes["TwoFactorResult"],
	disable2FA: ModelTypes["TwoFactorResult"],
	carrierMutations?: ModelTypes["carrierMutation"] | undefined | null
};
	["carrierMutation"]: {
		createReport: ModelTypes["Incident"],
	saveDraft: ModelTypes["Incident"],
	updateReport: ModelTypes["Incident"],
	deleteReport: ModelTypes["DeleteResult"],
	publishReport: ModelTypes["Incident"]
};
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["IncidentClass"]:IncidentClass;
	["ReportStatus"]:ReportStatus;
	["Incident"]: {
		id: ModelTypes["ID"],
	title: string,
	description?: string | undefined | null,
	kind: ModelTypes["IncidentKind"],
	incidentClass: ModelTypes["IncidentClass"],
	status: ModelTypes["ReportStatus"],
	lines?: Array<ModelTypes["Line"]> | undefined | null,
	createdBy?: ModelTypes["User"] | undefined | null,
	createdAt: string,
	updatedAt: string
};
	["Line"]: {
		id: ModelTypes["ID"],
	name: string,
	transportType: ModelTypes["TransportType"]
};
	["CreateReportInput"]: {
	title: string,
	description?: string | undefined | null,
	kind: ModelTypes["IncidentKind"],
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null
};
	["UpdateReportInput"]: {
	title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: ModelTypes["IncidentKind"] | undefined | null,
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null
};
	["DeleteResult"]: {
		success: boolean,
	message?: string | undefined | null
};
	["UserQuery"]: {
		dupa: string
};
	["Subscription"]: {
		_empty?: string | undefined | null
};
	["schema"]: {
	query?: ModelTypes["Query"] | undefined | null,
	mutation?: ModelTypes["Mutation"] | undefined | null,
	subscription?: ModelTypes["Subscription"] | undefined | null
};
	["ID"]:any
    }

export type GraphQLTypes = {
    ["UserRole"]: UserRole;
	["User"]: {
	__typename: "User",
	id: GraphQLTypes["ID"],
	createdAt: string,
	updatedAt: string,
	name: string,
	email: string,
	role: GraphQLTypes["UserRole"],
	twoFactorEnabled: boolean,
	['...on User']: Omit<GraphQLTypes["User"], "...on User">
};
	["TwoFactorSetup"]: {
	__typename: "TwoFactorSetup",
	secret: string,
	qrCode: string,
	['...on TwoFactorSetup']: Omit<GraphQLTypes["TwoFactorSetup"], "...on TwoFactorSetup">
};
	["TwoFactorStatus"]: {
	__typename: "TwoFactorStatus",
	requires2FA: boolean,
	userExists: boolean,
	['...on TwoFactorStatus']: Omit<GraphQLTypes["TwoFactorStatus"], "...on TwoFactorStatus">
};
	["TwoFactorResult"]: {
	__typename: "TwoFactorResult",
	success: boolean,
	message?: string | undefined | null,
	['...on TwoFactorResult']: Omit<GraphQLTypes["TwoFactorResult"], "...on TwoFactorResult">
};
	["Query"]: {
	__typename: "Query",
	me?: GraphQLTypes["User"] | undefined | null,
	check2FAStatus: GraphQLTypes["TwoFactorStatus"],
	userQuery?: GraphQLTypes["UserQuery"] | undefined | null,
	['...on Query']: Omit<GraphQLTypes["Query"], "...on Query">
};
	["RegisterInput"]: {
		name: string,
	email: string,
	password: string
};
	["RegisterResult"]: {
	__typename: "RegisterResult",
	success: boolean,
	message: string,
	userId?: string | undefined | null,
	['...on RegisterResult']: Omit<GraphQLTypes["RegisterResult"], "...on RegisterResult">
};
	["VerifyEmailResult"]: {
	__typename: "VerifyEmailResult",
	success: boolean,
	message: string,
	['...on VerifyEmailResult']: Omit<GraphQLTypes["VerifyEmailResult"], "...on VerifyEmailResult">
};
	["ResendVerificationResult"]: {
	__typename: "ResendVerificationResult",
	success: boolean,
	message: string,
	['...on ResendVerificationResult']: Omit<GraphQLTypes["ResendVerificationResult"], "...on ResendVerificationResult">
};
	["Mutation"]: {
	__typename: "Mutation",
	register: GraphQLTypes["RegisterResult"],
	verifyEmail: GraphQLTypes["VerifyEmailResult"],
	resendVerificationEmail: GraphQLTypes["ResendVerificationResult"],
	setup2FA: GraphQLTypes["TwoFactorSetup"],
	verify2FA: GraphQLTypes["TwoFactorResult"],
	disable2FA: GraphQLTypes["TwoFactorResult"],
	carrierMutations?: GraphQLTypes["carrierMutation"] | undefined | null,
	['...on Mutation']: Omit<GraphQLTypes["Mutation"], "...on Mutation">
};
	["carrierMutation"]: {
	__typename: "carrierMutation",
	createReport: GraphQLTypes["Incident"],
	saveDraft: GraphQLTypes["Incident"],
	updateReport: GraphQLTypes["Incident"],
	deleteReport: GraphQLTypes["DeleteResult"],
	publishReport: GraphQLTypes["Incident"],
	['...on carrierMutation']: Omit<GraphQLTypes["carrierMutation"], "...on carrierMutation">
};
	["IncidentKind"]: IncidentKind;
	["TransportType"]: TransportType;
	["IncidentClass"]: IncidentClass;
	["ReportStatus"]: ReportStatus;
	["Incident"]: {
	__typename: "Incident",
	id: GraphQLTypes["ID"],
	title: string,
	description?: string | undefined | null,
	kind: GraphQLTypes["IncidentKind"],
	incidentClass: GraphQLTypes["IncidentClass"],
	status: GraphQLTypes["ReportStatus"],
	lines?: Array<GraphQLTypes["Line"]> | undefined | null,
	createdBy?: GraphQLTypes["User"] | undefined | null,
	createdAt: string,
	updatedAt: string,
	['...on Incident']: Omit<GraphQLTypes["Incident"], "...on Incident">
};
	["Line"]: {
	__typename: "Line",
	id: GraphQLTypes["ID"],
	name: string,
	transportType: GraphQLTypes["TransportType"],
	['...on Line']: Omit<GraphQLTypes["Line"], "...on Line">
};
	["CreateReportInput"]: {
		title: string,
	description?: string | undefined | null,
	kind: GraphQLTypes["IncidentKind"],
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null
};
	["UpdateReportInput"]: {
		title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: GraphQLTypes["IncidentKind"] | undefined | null,
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null
};
	["DeleteResult"]: {
	__typename: "DeleteResult",
	success: boolean,
	message?: string | undefined | null,
	['...on DeleteResult']: Omit<GraphQLTypes["DeleteResult"], "...on DeleteResult">
};
	["UserQuery"]: {
	__typename: "UserQuery",
	dupa: string,
	['...on UserQuery']: Omit<GraphQLTypes["UserQuery"], "...on UserQuery">
};
	["Subscription"]: {
	__typename: "Subscription",
	_empty?: string | undefined | null,
	['...on Subscription']: Omit<GraphQLTypes["Subscription"], "...on Subscription">
};
	["ID"]: "scalar" & { name: "ID" }
    }
export enum UserRole {
	USER = "USER",
	MODERATOR = "MODERATOR",
	ADMIN = "ADMIN"
}
export enum IncidentKind {
	INCIDENT = "INCIDENT",
	NETWORK_FAILURE = "NETWORK_FAILURE",
	VEHICLE_FAILURE = "VEHICLE_FAILURE",
	PEDESTRIAN_ACCIDENT = "PEDESTRIAN_ACCIDENT",
	TRAFFIC_JAM = "TRAFFIC_JAM",
	PLATFORM_CHANGES = "PLATFORM_CHANGES"
}
export enum TransportType {
	BUS = "BUS",
	RAIL = "RAIL"
}
export enum IncidentClass {
	CLASS_1 = "CLASS_1",
	CLASS_2 = "CLASS_2"
}
export enum ReportStatus {
	DRAFT = "DRAFT",
	PUBLISHED = "PUBLISHED",
	RESOLVED = "RESOLVED"
}

type ZEUS_VARIABLES = {
	["UserRole"]: ValueTypes["UserRole"];
	["RegisterInput"]: ValueTypes["RegisterInput"];
	["IncidentKind"]: ValueTypes["IncidentKind"];
	["TransportType"]: ValueTypes["TransportType"];
	["IncidentClass"]: ValueTypes["IncidentClass"];
	["ReportStatus"]: ValueTypes["ReportStatus"];
	["CreateReportInput"]: ValueTypes["CreateReportInput"];
	["UpdateReportInput"]: ValueTypes["UpdateReportInput"];
	["ID"]: ValueTypes["ID"];
}