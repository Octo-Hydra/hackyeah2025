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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
	name?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	reputation?:boolean | `@${string}`,
	trustScore?:boolean | `@${string}`,
	trustScoreBreakdown?:ValueTypes["TrustScoreBreakdown"],
	activeJourney?:ValueTypes["ActiveJourney"],
		__typename?: boolean | `@${string}`,
	['...on User']?: Omit<ValueTypes["User"], "...on User">
}>;
	["TrustScoreBreakdown"]: AliasType<{
	baseScore?:boolean | `@${string}`,
	accuracyBonus?:boolean | `@${string}`,
	highRepBonus?:boolean | `@${string}`,
	validationRate?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on TrustScoreBreakdown']?: Omit<ValueTypes["TrustScoreBreakdown"], "...on TrustScoreBreakdown">
}>;
	["ActiveJourney"]: AliasType<{
	segments?:ValueTypes["PathSegment"],
	startTime?:boolean | `@${string}`,
	expectedEndTime?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on ActiveJourney']?: Omit<ValueTypes["ActiveJourney"], "...on ActiveJourney">
}>;
	["FavoriteConnection"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	startStopId?:boolean | `@${string}`,
	endStopId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on FavoriteConnection']?: Omit<ValueTypes["FavoriteConnection"], "...on FavoriteConnection">
}>;
	["ActiveJourneyInput"]: {
	segments: Array<ValueTypes["PathSegmentInput"]> | Variable<any, string>
};
	["PathSegmentInput"]: {
	from: ValueTypes["SegmentLocationInput"] | Variable<any, string>,
	to: ValueTypes["SegmentLocationInput"] | Variable<any, string>,
	lineId: ValueTypes["ID"] | Variable<any, string>,
	lineName: string | Variable<any, string>,
	transportType: ValueTypes["TransportType"] | Variable<any, string>,
	departureTime: string | Variable<any, string>,
	arrivalTime: string | Variable<any, string>,
	duration: number | Variable<any, string>
};
	["SegmentLocationInput"]: {
	stopId: ValueTypes["ID"] | Variable<any, string>,
	stopName: string | Variable<any, string>,
	coordinates: ValueTypes["CoordinatesInput"] | Variable<any, string>
};
	["FavoriteConnectionInput"]: {
	name: string | Variable<any, string>,
	startStopId: ValueTypes["ID"] | Variable<any, string>,
	endStopId: ValueTypes["ID"] | Variable<any, string>
};
	["OperationResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on OperationResult']?: Omit<ValueTypes["OperationResult"], "...on OperationResult">
}>;
	["TwoFactorSetup"]: AliasType<{
	secret?:boolean | `@${string}`,
	qrCode?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on TwoFactorSetup']?: Omit<ValueTypes["TwoFactorSetup"], "...on TwoFactorSetup">
}>;
	["Query"]: AliasType<{
	me?:ValueTypes["User"],
incidentsByLine?: [{	lineId: ValueTypes["ID"] | Variable<any, string>,	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>},ValueTypes["Incident"]],
lines?: [{	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>},ValueTypes["Line"]],
stops?: [{	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>},ValueTypes["Stop"]],
findPath?: [{	input: ValueTypes["FindPathInput"] | Variable<any, string>},ValueTypes["JourneyPath"]],
	admin?:ValueTypes["AdminQuery"],
		__typename?: boolean | `@${string}`,
	['...on Query']?: Omit<ValueTypes["Query"], "...on Query">
}>;
	["AdminQuery"]: AliasType<{
users?: [{	filter?: ValueTypes["UserFilterInput"] | undefined | null | Variable<any, string>,	pagination?: ValueTypes["PaginationInput"] | undefined | null | Variable<any, string>},ValueTypes["UserConnection"]],
user?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["User"]],
incidents?: [{	filter?: ValueTypes["IncidentFilterInput"] | undefined | null | Variable<any, string>,	pagination?: ValueTypes["PaginationInput"] | undefined | null | Variable<any, string>},ValueTypes["IncidentConnection"]],
incident?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
archivedIncidents?: [{	filter?: ValueTypes["IncidentFilterInput"] | undefined | null | Variable<any, string>,	pagination?: ValueTypes["PaginationInput"] | undefined | null | Variable<any, string>},ValueTypes["IncidentConnection"]],
	stats?:ValueTypes["AdminStats"],
lineIncidentStats?: [{	lineId: ValueTypes["ID"] | Variable<any, string>,	period: ValueTypes["StatsPeriod"] | Variable<any, string>},ValueTypes["LineIncidentStats"]],
lineDelayStats?: [{	lineId: ValueTypes["ID"] | Variable<any, string>,	period: ValueTypes["StatsPeriod"] | Variable<any, string>},ValueTypes["LineDelayStats"]],
topDelays?: [{	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>,	period: ValueTypes["StatsPeriod"] | Variable<any, string>,	limit?: number | undefined | null | Variable<any, string>},ValueTypes["LineDelayRanking"]],
linesIncidentOverview?: [{	period: ValueTypes["StatsPeriod"] | Variable<any, string>},ValueTypes["LineIncidentOverview"]],
		__typename?: boolean | `@${string}`,
	['...on AdminQuery']?: Omit<ValueTypes["AdminQuery"], "...on AdminQuery">
}>;
	["AdminStats"]: AliasType<{
	totalUsers?:boolean | `@${string}`,
	totalIncidents?:boolean | `@${string}`,
	activeIncidents?:boolean | `@${string}`,
	resolvedIncidents?:boolean | `@${string}`,
	fakeIncidents?:boolean | `@${string}`,
	usersByRole?:ValueTypes["RoleStats"],
	incidentsByKind?:ValueTypes["KindStats"],
	averageReputation?:boolean | `@${string}`,
	averageTrustScore?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on AdminStats']?: Omit<ValueTypes["AdminStats"], "...on AdminStats">
}>;
	["RoleStats"]: AliasType<{
	users?:boolean | `@${string}`,
	moderators?:boolean | `@${string}`,
	admins?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on RoleStats']?: Omit<ValueTypes["RoleStats"], "...on RoleStats">
}>;
	["KindStats"]: AliasType<{
	kind?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on KindStats']?: Omit<ValueTypes["KindStats"], "...on KindStats">
}>;
	["UserConnection"]: AliasType<{
	edges?:ValueTypes["UserEdge"],
	pageInfo?:ValueTypes["PageInfo"],
	totalCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on UserConnection']?: Omit<ValueTypes["UserConnection"], "...on UserConnection">
}>;
	["UserEdge"]: AliasType<{
	node?:ValueTypes["User"],
	id?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on UserEdge']?: Omit<ValueTypes["UserEdge"], "...on UserEdge">
}>;
	["IncidentConnection"]: AliasType<{
	edges?:ValueTypes["IncidentEdge"],
	pageInfo?:ValueTypes["PageInfo"],
	totalCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on IncidentConnection']?: Omit<ValueTypes["IncidentConnection"], "...on IncidentConnection">
}>;
	["IncidentEdge"]: AliasType<{
	node?:ValueTypes["Incident"],
	id?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on IncidentEdge']?: Omit<ValueTypes["IncidentEdge"], "...on IncidentEdge">
}>;
	["PageInfo"]: AliasType<{
	hasNextPage?:boolean | `@${string}`,
	hasPreviousPage?:boolean | `@${string}`,
	startCursor?:boolean | `@${string}`,
	endCursor?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on PageInfo']?: Omit<ValueTypes["PageInfo"], "...on PageInfo">
}>;
	["UserFilterInput"]: {
	role?: ValueTypes["UserRole"] | undefined | null | Variable<any, string>,
	minReputation?: number | undefined | null | Variable<any, string>,
	maxReputation?: number | undefined | null | Variable<any, string>,
	minTrustScore?: number | undefined | null | Variable<any, string>,
	maxTrustScore?: number | undefined | null | Variable<any, string>,
	search?: string | undefined | null | Variable<any, string>
};
	["IncidentFilterInput"]: {
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	kind?: ValueTypes["IncidentKind"] | undefined | null | Variable<any, string>,
	lineId?: ValueTypes["ID"] | undefined | null | Variable<any, string>,
	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>,
	isFake?: boolean | undefined | null | Variable<any, string>,
	reportedBy?: ValueTypes["ID"] | undefined | null | Variable<any, string>,
	dateFrom?: string | undefined | null | Variable<any, string>,
	dateTo?: string | undefined | null | Variable<any, string>
};
	["PaginationInput"]: {
	first?: number | undefined | null | Variable<any, string>,
	after?: ValueTypes["ID"] | undefined | null | Variable<any, string>,
	last?: number | undefined | null | Variable<any, string>,
	before?: ValueTypes["ID"] | undefined | null | Variable<any, string>
};
	["Mutation"]: AliasType<{
register?: [{	name: string | Variable<any, string>,	email: string | Variable<any, string>,	password: string | Variable<any, string>},boolean | `@${string}`],
verifyEmail?: [{	token: string | Variable<any, string>},boolean | `@${string}`],
resendVerificationEmail?: [{	email: string | Variable<any, string>},boolean | `@${string}`],
	setup2FA?:ValueTypes["TwoFactorSetup"],
verify2FA?: [{	token: string | Variable<any, string>,	secret: string | Variable<any, string>},boolean | `@${string}`],
	disable2FA?:boolean | `@${string}`,
createReport?: [{	input: ValueTypes["CreateReportInput"] | Variable<any, string>},ValueTypes["Incident"]],
updateReport?: [{	id: ValueTypes["ID"] | Variable<any, string>,	input: ValueTypes["UpdateReportInput"] | Variable<any, string>},ValueTypes["Incident"]],
deleteReport?: [{	id: ValueTypes["ID"] | Variable<any, string>},boolean | `@${string}`],
publishReport?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
resolveReport?: [{	id: ValueTypes["ID"] | Variable<any, string>,	isFake?: boolean | undefined | null | Variable<any, string>},ValueTypes["Incident"]],
setActiveJourney?: [{	input: ValueTypes["ActiveJourneyInput"] | Variable<any, string>},ValueTypes["ActiveJourney"]],
	clearActiveJourney?:boolean | `@${string}`,
addFavoriteConnection?: [{	input: ValueTypes["FavoriteConnectionInput"] | Variable<any, string>},boolean | `@${string}`],
removeFavoriteConnection?: [{	id: ValueTypes["ID"] | Variable<any, string>},boolean | `@${string}`],
	admin?:ValueTypes["AdminMutation"],
		__typename?: boolean | `@${string}`,
	['...on Mutation']?: Omit<ValueTypes["Mutation"], "...on Mutation">
}>;
	["AdminMutation"]: AliasType<{
createUser?: [{	input: ValueTypes["CreateUserInput"] | Variable<any, string>},ValueTypes["User"]],
updateUser?: [{	id: ValueTypes["ID"] | Variable<any, string>,	input: ValueTypes["UpdateUserInput"] | Variable<any, string>},ValueTypes["User"]],
deleteUser?: [{	id: ValueTypes["ID"] | Variable<any, string>},boolean | `@${string}`],
updateUserRole?: [{	id: ValueTypes["ID"] | Variable<any, string>,	role: ValueTypes["UserRole"] | Variable<any, string>},ValueTypes["User"]],
updateUserReputation?: [{	id: ValueTypes["ID"] | Variable<any, string>,	reputation: number | Variable<any, string>},ValueTypes["User"]],
createIncident?: [{	input: ValueTypes["CreateAdminIncidentInput"] | Variable<any, string>},ValueTypes["Incident"]],
updateIncident?: [{	id: ValueTypes["ID"] | Variable<any, string>,	input: ValueTypes["UpdateAdminIncidentInput"] | Variable<any, string>},ValueTypes["Incident"]],
deleteIncident?: [{	id: ValueTypes["ID"] | Variable<any, string>},boolean | `@${string}`],
markIncidentAsFake?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
restoreIncident?: [{	id: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
bulkResolveIncidents?: [{	ids: Array<ValueTypes["ID"]> | Variable<any, string>},ValueTypes["Incident"]],
bulkDeleteIncidents?: [{	ids: Array<ValueTypes["ID"]> | Variable<any, string>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`,
	['...on AdminMutation']?: Omit<ValueTypes["AdminMutation"], "...on AdminMutation">
}>;
	["CreateUserInput"]: {
	name: string | Variable<any, string>,
	email: string | Variable<any, string>,
	password: string | Variable<any, string>,
	role: ValueTypes["UserRole"] | Variable<any, string>,
	reputation?: number | undefined | null | Variable<any, string>
};
	["UpdateUserInput"]: {
	name?: string | undefined | null | Variable<any, string>,
	email?: string | undefined | null | Variable<any, string>,
	password?: string | undefined | null | Variable<any, string>,
	role?: ValueTypes["UserRole"] | undefined | null | Variable<any, string>,
	reputation?: number | undefined | null | Variable<any, string>
};
	["CreateAdminIncidentInput"]: {
	title: string | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	kind: ValueTypes["IncidentKind"] | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>,
	affectedSegment?: ValueTypes["IncidentSegmentInput"] | undefined | null | Variable<any, string>,
	delayMinutes?: number | undefined | null | Variable<any, string>
};
	["UpdateAdminIncidentInput"]: {
	title?: string | undefined | null | Variable<any, string>,
	description?: string | undefined | null | Variable<any, string>,
	kind?: ValueTypes["IncidentKind"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>,
	affectedSegment?: ValueTypes["IncidentSegmentInput"] | undefined | null | Variable<any, string>,
	delayMinutes?: number | undefined | null | Variable<any, string>,
	isFake?: boolean | undefined | null | Variable<any, string>
};
	["IncidentSegmentInput"]: {
	startStopId: ValueTypes["ID"] | Variable<any, string>,
	endStopId: ValueTypes["ID"] | Variable<any, string>,
	lineId?: ValueTypes["ID"] | undefined | null | Variable<any, string>
};
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["ReportStatus"]:ReportStatus;
	["Incident"]: AliasType<{
	id?:boolean | `@${string}`,
	title?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	kind?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	lines?:ValueTypes["Line"],
	affectedSegment?:ValueTypes["IncidentSegment"],
	delayMinutes?:boolean | `@${string}`,
	isFake?:boolean | `@${string}`,
	reportedBy?:boolean | `@${string}`,
	reporter?:ValueTypes["User"],
	createdAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Incident']?: Omit<ValueTypes["Incident"], "...on Incident">
}>;
	["IncidentSegment"]: AliasType<{
	startStopId?:boolean | `@${string}`,
	endStopId?:boolean | `@${string}`,
	lineId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on IncidentSegment']?: Omit<ValueTypes["IncidentSegment"], "...on IncidentSegment">
}>;
	["Line"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Line']?: Omit<ValueTypes["Line"], "...on Line">
}>;
	["CreateReportInput"]: {
	description?: string | undefined | null | Variable<any, string>,
	kind: ValueTypes["IncidentKind"] | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>,
	reporterLocation?: ValueTypes["CoordinatesInput"] | undefined | null | Variable<any, string>,
	delayMinutes?: number | undefined | null | Variable<any, string>
};
	["UpdateReportInput"]: {
	description?: string | undefined | null | Variable<any, string>,
	kind?: ValueTypes["IncidentKind"] | undefined | null | Variable<any, string>,
	status?: ValueTypes["ReportStatus"] | undefined | null | Variable<any, string>,
	lineIds?: Array<ValueTypes["ID"]> | undefined | null | Variable<any, string>,
	delayMinutes?: number | undefined | null | Variable<any, string>
};
	["Coordinates"]: AliasType<{
	latitude?:boolean | `@${string}`,
	longitude?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Coordinates']?: Omit<ValueTypes["Coordinates"], "...on Coordinates">
}>;
	["CoordinatesInput"]: {
	latitude: number | Variable<any, string>,
	longitude: number | Variable<any, string>
};
	["Stop"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	coordinates?:ValueTypes["Coordinates"],
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on Stop']?: Omit<ValueTypes["Stop"], "...on Stop">
}>;
	["SegmentLocation"]: AliasType<{
	stopId?:boolean | `@${string}`,
	stopName?:boolean | `@${string}`,
	coordinates?:ValueTypes["Coordinates"],
		__typename?: boolean | `@${string}`,
	['...on SegmentLocation']?: Omit<ValueTypes["SegmentLocation"], "...on SegmentLocation">
}>;
	["PathSegment"]: AliasType<{
	from?:ValueTypes["SegmentLocation"],
	to?:ValueTypes["SegmentLocation"],
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	departureTime?:boolean | `@${string}`,
	arrivalTime?:boolean | `@${string}`,
	duration?:boolean | `@${string}`,
	hasIncident?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on PathSegment']?: Omit<ValueTypes["PathSegment"], "...on PathSegment">
}>;
	["JourneyPath"]: AliasType<{
	segments?:ValueTypes["PathSegment"],
	totalDuration?:boolean | `@${string}`,
	departureTime?:boolean | `@${string}`,
	arrivalTime?:boolean | `@${string}`,
	warnings?:boolean | `@${string}`,
	hasIncidents?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on JourneyPath']?: Omit<ValueTypes["JourneyPath"], "...on JourneyPath">
}>;
	["FindPathInput"]: {
	from: ValueTypes["CoordinatesInput"] | Variable<any, string>,
	to: ValueTypes["CoordinatesInput"] | Variable<any, string>,
	departureTime?: string | undefined | null | Variable<any, string>
};
	["Subscription"]: AliasType<{
incidentCreated?: [{	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>},ValueTypes["Incident"]],
incidentUpdated?: [{	transportType?: ValueTypes["TransportType"] | undefined | null | Variable<any, string>},ValueTypes["Incident"]],
lineIncidentUpdates?: [{	lineId: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
myLinesIncidents?: [{	lineIds: Array<ValueTypes["ID"]> | Variable<any, string>},ValueTypes["Incident"]],
smartIncidentNotifications?: [{	userId: ValueTypes["ID"] | Variable<any, string>},ValueTypes["Incident"]],
		__typename?: boolean | `@${string}`,
	['...on Subscription']?: Omit<ValueTypes["Subscription"], "...on Subscription">
}>;
	["StatsPeriod"]:StatsPeriod;
	["LineIncidentStats"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	period?:boolean | `@${string}`,
	totalIncidents?:boolean | `@${string}`,
	incidentsByKind?:ValueTypes["IncidentKindCount"],
	averageDelayMinutes?:boolean | `@${string}`,
	timeline?:ValueTypes["IncidentTimelineEntry"],
		__typename?: boolean | `@${string}`,
	['...on LineIncidentStats']?: Omit<ValueTypes["LineIncidentStats"], "...on LineIncidentStats">
}>;
	["IncidentKindCount"]: AliasType<{
	kind?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on IncidentKindCount']?: Omit<ValueTypes["IncidentKindCount"], "...on IncidentKindCount">
}>;
	["IncidentTimelineEntry"]: AliasType<{
	timestamp?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on IncidentTimelineEntry']?: Omit<ValueTypes["IncidentTimelineEntry"], "...on IncidentTimelineEntry">
}>;
	["LineDelayStats"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	period?:boolean | `@${string}`,
	totalDelays?:boolean | `@${string}`,
	averageDelayMinutes?:boolean | `@${string}`,
	maxDelayMinutes?:boolean | `@${string}`,
	minDelayMinutes?:boolean | `@${string}`,
	delayDistribution?:ValueTypes["DelayBucket"],
		__typename?: boolean | `@${string}`,
	['...on LineDelayStats']?: Omit<ValueTypes["LineDelayStats"], "...on LineDelayStats">
}>;
	["DelayBucket"]: AliasType<{
	rangeLabel?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on DelayBucket']?: Omit<ValueTypes["DelayBucket"], "...on DelayBucket">
}>;
	["LineDelayRanking"]: AliasType<{
	rank?:boolean | `@${string}`,
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	totalDelays?:boolean | `@${string}`,
	averageDelayMinutes?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on LineDelayRanking']?: Omit<ValueTypes["LineDelayRanking"], "...on LineDelayRanking">
}>;
	["LineIncidentOverview"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
	lastIncidentTime?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`,
	['...on LineIncidentOverview']?: Omit<ValueTypes["LineIncidentOverview"], "...on LineIncidentOverview">
}>;
	["ID"]:unknown
  }

export type ResolverInputTypes = {
    ["UserRole"]:UserRole;
	["User"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	email?:boolean | `@${string}`,
	role?:boolean | `@${string}`,
	reputation?:boolean | `@${string}`,
	trustScore?:boolean | `@${string}`,
	trustScoreBreakdown?:ResolverInputTypes["TrustScoreBreakdown"],
	activeJourney?:ResolverInputTypes["ActiveJourney"],
		__typename?: boolean | `@${string}`
}>;
	["TrustScoreBreakdown"]: AliasType<{
	baseScore?:boolean | `@${string}`,
	accuracyBonus?:boolean | `@${string}`,
	highRepBonus?:boolean | `@${string}`,
	validationRate?:boolean | `@${string}`,
	updatedAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["ActiveJourney"]: AliasType<{
	segments?:ResolverInputTypes["PathSegment"],
	startTime?:boolean | `@${string}`,
	expectedEndTime?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FavoriteConnection"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	startStopId?:boolean | `@${string}`,
	endStopId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["ActiveJourneyInput"]: {
	segments: Array<ResolverInputTypes["PathSegmentInput"]>
};
	["PathSegmentInput"]: {
	from: ResolverInputTypes["SegmentLocationInput"],
	to: ResolverInputTypes["SegmentLocationInput"],
	lineId: ResolverInputTypes["ID"],
	lineName: string,
	transportType: ResolverInputTypes["TransportType"],
	departureTime: string,
	arrivalTime: string,
	duration: number
};
	["SegmentLocationInput"]: {
	stopId: ResolverInputTypes["ID"],
	stopName: string,
	coordinates: ResolverInputTypes["CoordinatesInput"]
};
	["FavoriteConnectionInput"]: {
	name: string,
	startStopId: ResolverInputTypes["ID"],
	endStopId: ResolverInputTypes["ID"]
};
	["OperationResult"]: AliasType<{
	success?:boolean | `@${string}`,
	message?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["TwoFactorSetup"]: AliasType<{
	secret?:boolean | `@${string}`,
	qrCode?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Query"]: AliasType<{
	me?:ResolverInputTypes["User"],
incidentsByLine?: [{	lineId: ResolverInputTypes["ID"],	transportType?: ResolverInputTypes["TransportType"] | undefined | null},ResolverInputTypes["Incident"]],
lines?: [{	transportType?: ResolverInputTypes["TransportType"] | undefined | null},ResolverInputTypes["Line"]],
stops?: [{	transportType?: ResolverInputTypes["TransportType"] | undefined | null},ResolverInputTypes["Stop"]],
findPath?: [{	input: ResolverInputTypes["FindPathInput"]},ResolverInputTypes["JourneyPath"]],
	admin?:ResolverInputTypes["AdminQuery"],
		__typename?: boolean | `@${string}`
}>;
	["AdminQuery"]: AliasType<{
users?: [{	filter?: ResolverInputTypes["UserFilterInput"] | undefined | null,	pagination?: ResolverInputTypes["PaginationInput"] | undefined | null},ResolverInputTypes["UserConnection"]],
user?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["User"]],
incidents?: [{	filter?: ResolverInputTypes["IncidentFilterInput"] | undefined | null,	pagination?: ResolverInputTypes["PaginationInput"] | undefined | null},ResolverInputTypes["IncidentConnection"]],
incident?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
archivedIncidents?: [{	filter?: ResolverInputTypes["IncidentFilterInput"] | undefined | null,	pagination?: ResolverInputTypes["PaginationInput"] | undefined | null},ResolverInputTypes["IncidentConnection"]],
	stats?:ResolverInputTypes["AdminStats"],
lineIncidentStats?: [{	lineId: ResolverInputTypes["ID"],	period: ResolverInputTypes["StatsPeriod"]},ResolverInputTypes["LineIncidentStats"]],
lineDelayStats?: [{	lineId: ResolverInputTypes["ID"],	period: ResolverInputTypes["StatsPeriod"]},ResolverInputTypes["LineDelayStats"]],
topDelays?: [{	transportType?: ResolverInputTypes["TransportType"] | undefined | null,	period: ResolverInputTypes["StatsPeriod"],	limit?: number | undefined | null},ResolverInputTypes["LineDelayRanking"]],
linesIncidentOverview?: [{	period: ResolverInputTypes["StatsPeriod"]},ResolverInputTypes["LineIncidentOverview"]],
		__typename?: boolean | `@${string}`
}>;
	["AdminStats"]: AliasType<{
	totalUsers?:boolean | `@${string}`,
	totalIncidents?:boolean | `@${string}`,
	activeIncidents?:boolean | `@${string}`,
	resolvedIncidents?:boolean | `@${string}`,
	fakeIncidents?:boolean | `@${string}`,
	usersByRole?:ResolverInputTypes["RoleStats"],
	incidentsByKind?:ResolverInputTypes["KindStats"],
	averageReputation?:boolean | `@${string}`,
	averageTrustScore?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["RoleStats"]: AliasType<{
	users?:boolean | `@${string}`,
	moderators?:boolean | `@${string}`,
	admins?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["KindStats"]: AliasType<{
	kind?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserConnection"]: AliasType<{
	edges?:ResolverInputTypes["UserEdge"],
	pageInfo?:ResolverInputTypes["PageInfo"],
	totalCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserEdge"]: AliasType<{
	node?:ResolverInputTypes["User"],
	id?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["IncidentConnection"]: AliasType<{
	edges?:ResolverInputTypes["IncidentEdge"],
	pageInfo?:ResolverInputTypes["PageInfo"],
	totalCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["IncidentEdge"]: AliasType<{
	node?:ResolverInputTypes["Incident"],
	id?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["PageInfo"]: AliasType<{
	hasNextPage?:boolean | `@${string}`,
	hasPreviousPage?:boolean | `@${string}`,
	startCursor?:boolean | `@${string}`,
	endCursor?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["UserFilterInput"]: {
	role?: ResolverInputTypes["UserRole"] | undefined | null,
	minReputation?: number | undefined | null,
	maxReputation?: number | undefined | null,
	minTrustScore?: number | undefined | null,
	maxTrustScore?: number | undefined | null,
	search?: string | undefined | null
};
	["IncidentFilterInput"]: {
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	kind?: ResolverInputTypes["IncidentKind"] | undefined | null,
	lineId?: ResolverInputTypes["ID"] | undefined | null,
	transportType?: ResolverInputTypes["TransportType"] | undefined | null,
	isFake?: boolean | undefined | null,
	reportedBy?: ResolverInputTypes["ID"] | undefined | null,
	dateFrom?: string | undefined | null,
	dateTo?: string | undefined | null
};
	["PaginationInput"]: {
	first?: number | undefined | null,
	after?: ResolverInputTypes["ID"] | undefined | null,
	last?: number | undefined | null,
	before?: ResolverInputTypes["ID"] | undefined | null
};
	["Mutation"]: AliasType<{
register?: [{	name: string,	email: string,	password: string},boolean | `@${string}`],
verifyEmail?: [{	token: string},boolean | `@${string}`],
resendVerificationEmail?: [{	email: string},boolean | `@${string}`],
	setup2FA?:ResolverInputTypes["TwoFactorSetup"],
verify2FA?: [{	token: string,	secret: string},boolean | `@${string}`],
	disable2FA?:boolean | `@${string}`,
createReport?: [{	input: ResolverInputTypes["CreateReportInput"]},ResolverInputTypes["Incident"]],
updateReport?: [{	id: ResolverInputTypes["ID"],	input: ResolverInputTypes["UpdateReportInput"]},ResolverInputTypes["Incident"]],
deleteReport?: [{	id: ResolverInputTypes["ID"]},boolean | `@${string}`],
publishReport?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
resolveReport?: [{	id: ResolverInputTypes["ID"],	isFake?: boolean | undefined | null},ResolverInputTypes["Incident"]],
setActiveJourney?: [{	input: ResolverInputTypes["ActiveJourneyInput"]},ResolverInputTypes["ActiveJourney"]],
	clearActiveJourney?:boolean | `@${string}`,
addFavoriteConnection?: [{	input: ResolverInputTypes["FavoriteConnectionInput"]},boolean | `@${string}`],
removeFavoriteConnection?: [{	id: ResolverInputTypes["ID"]},boolean | `@${string}`],
	admin?:ResolverInputTypes["AdminMutation"],
		__typename?: boolean | `@${string}`
}>;
	["AdminMutation"]: AliasType<{
createUser?: [{	input: ResolverInputTypes["CreateUserInput"]},ResolverInputTypes["User"]],
updateUser?: [{	id: ResolverInputTypes["ID"],	input: ResolverInputTypes["UpdateUserInput"]},ResolverInputTypes["User"]],
deleteUser?: [{	id: ResolverInputTypes["ID"]},boolean | `@${string}`],
updateUserRole?: [{	id: ResolverInputTypes["ID"],	role: ResolverInputTypes["UserRole"]},ResolverInputTypes["User"]],
updateUserReputation?: [{	id: ResolverInputTypes["ID"],	reputation: number},ResolverInputTypes["User"]],
createIncident?: [{	input: ResolverInputTypes["CreateAdminIncidentInput"]},ResolverInputTypes["Incident"]],
updateIncident?: [{	id: ResolverInputTypes["ID"],	input: ResolverInputTypes["UpdateAdminIncidentInput"]},ResolverInputTypes["Incident"]],
deleteIncident?: [{	id: ResolverInputTypes["ID"]},boolean | `@${string}`],
markIncidentAsFake?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
restoreIncident?: [{	id: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
bulkResolveIncidents?: [{	ids: Array<ResolverInputTypes["ID"]>},ResolverInputTypes["Incident"]],
bulkDeleteIncidents?: [{	ids: Array<ResolverInputTypes["ID"]>},boolean | `@${string}`],
		__typename?: boolean | `@${string}`
}>;
	["CreateUserInput"]: {
	name: string,
	email: string,
	password: string,
	role: ResolverInputTypes["UserRole"],
	reputation?: number | undefined | null
};
	["UpdateUserInput"]: {
	name?: string | undefined | null,
	email?: string | undefined | null,
	password?: string | undefined | null,
	role?: ResolverInputTypes["UserRole"] | undefined | null,
	reputation?: number | undefined | null
};
	["CreateAdminIncidentInput"]: {
	title: string,
	description?: string | undefined | null,
	kind: ResolverInputTypes["IncidentKind"],
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null,
	affectedSegment?: ResolverInputTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateAdminIncidentInput"]: {
	title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: ResolverInputTypes["IncidentKind"] | undefined | null,
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null,
	affectedSegment?: ResolverInputTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null,
	isFake?: boolean | undefined | null
};
	["IncidentSegmentInput"]: {
	startStopId: ResolverInputTypes["ID"],
	endStopId: ResolverInputTypes["ID"],
	lineId?: ResolverInputTypes["ID"] | undefined | null
};
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["ReportStatus"]:ReportStatus;
	["Incident"]: AliasType<{
	id?:boolean | `@${string}`,
	title?:boolean | `@${string}`,
	description?:boolean | `@${string}`,
	kind?:boolean | `@${string}`,
	status?:boolean | `@${string}`,
	lines?:ResolverInputTypes["Line"],
	affectedSegment?:ResolverInputTypes["IncidentSegment"],
	delayMinutes?:boolean | `@${string}`,
	isFake?:boolean | `@${string}`,
	reportedBy?:boolean | `@${string}`,
	reporter?:ResolverInputTypes["User"],
	createdAt?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["IncidentSegment"]: AliasType<{
	startStopId?:boolean | `@${string}`,
	endStopId?:boolean | `@${string}`,
	lineId?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["Line"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["CreateReportInput"]: {
	description?: string | undefined | null,
	kind: ResolverInputTypes["IncidentKind"],
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null,
	reporterLocation?: ResolverInputTypes["CoordinatesInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateReportInput"]: {
	description?: string | undefined | null,
	kind?: ResolverInputTypes["IncidentKind"] | undefined | null,
	status?: ResolverInputTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ResolverInputTypes["ID"]> | undefined | null,
	delayMinutes?: number | undefined | null
};
	["Coordinates"]: AliasType<{
	latitude?:boolean | `@${string}`,
	longitude?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["CoordinatesInput"]: {
	latitude: number,
	longitude: number
};
	["Stop"]: AliasType<{
	id?:boolean | `@${string}`,
	name?:boolean | `@${string}`,
	coordinates?:ResolverInputTypes["Coordinates"],
	transportType?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["SegmentLocation"]: AliasType<{
	stopId?:boolean | `@${string}`,
	stopName?:boolean | `@${string}`,
	coordinates?:ResolverInputTypes["Coordinates"],
		__typename?: boolean | `@${string}`
}>;
	["PathSegment"]: AliasType<{
	from?:ResolverInputTypes["SegmentLocation"],
	to?:ResolverInputTypes["SegmentLocation"],
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	departureTime?:boolean | `@${string}`,
	arrivalTime?:boolean | `@${string}`,
	duration?:boolean | `@${string}`,
	hasIncident?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["JourneyPath"]: AliasType<{
	segments?:ResolverInputTypes["PathSegment"],
	totalDuration?:boolean | `@${string}`,
	departureTime?:boolean | `@${string}`,
	arrivalTime?:boolean | `@${string}`,
	warnings?:boolean | `@${string}`,
	hasIncidents?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["FindPathInput"]: {
	from: ResolverInputTypes["CoordinatesInput"],
	to: ResolverInputTypes["CoordinatesInput"],
	departureTime?: string | undefined | null
};
	["Subscription"]: AliasType<{
incidentCreated?: [{	transportType?: ResolverInputTypes["TransportType"] | undefined | null},ResolverInputTypes["Incident"]],
incidentUpdated?: [{	transportType?: ResolverInputTypes["TransportType"] | undefined | null},ResolverInputTypes["Incident"]],
lineIncidentUpdates?: [{	lineId: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
myLinesIncidents?: [{	lineIds: Array<ResolverInputTypes["ID"]>},ResolverInputTypes["Incident"]],
smartIncidentNotifications?: [{	userId: ResolverInputTypes["ID"]},ResolverInputTypes["Incident"]],
		__typename?: boolean | `@${string}`
}>;
	["StatsPeriod"]:StatsPeriod;
	["LineIncidentStats"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	period?:boolean | `@${string}`,
	totalIncidents?:boolean | `@${string}`,
	incidentsByKind?:ResolverInputTypes["IncidentKindCount"],
	averageDelayMinutes?:boolean | `@${string}`,
	timeline?:ResolverInputTypes["IncidentTimelineEntry"],
		__typename?: boolean | `@${string}`
}>;
	["IncidentKindCount"]: AliasType<{
	kind?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["IncidentTimelineEntry"]: AliasType<{
	timestamp?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["LineDelayStats"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	period?:boolean | `@${string}`,
	totalDelays?:boolean | `@${string}`,
	averageDelayMinutes?:boolean | `@${string}`,
	maxDelayMinutes?:boolean | `@${string}`,
	minDelayMinutes?:boolean | `@${string}`,
	delayDistribution?:ResolverInputTypes["DelayBucket"],
		__typename?: boolean | `@${string}`
}>;
	["DelayBucket"]: AliasType<{
	rangeLabel?:boolean | `@${string}`,
	count?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["LineDelayRanking"]: AliasType<{
	rank?:boolean | `@${string}`,
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	totalDelays?:boolean | `@${string}`,
	averageDelayMinutes?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
		__typename?: boolean | `@${string}`
}>;
	["LineIncidentOverview"]: AliasType<{
	lineId?:boolean | `@${string}`,
	lineName?:boolean | `@${string}`,
	transportType?:boolean | `@${string}`,
	incidentCount?:boolean | `@${string}`,
	lastIncidentTime?:boolean | `@${string}`,
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
	name: string,
	email: string,
	role: ModelTypes["UserRole"],
	reputation?: number | undefined | null,
	trustScore?: number | undefined | null,
	trustScoreBreakdown?: ModelTypes["TrustScoreBreakdown"] | undefined | null,
	activeJourney?: ModelTypes["ActiveJourney"] | undefined | null
};
	["TrustScoreBreakdown"]: {
		baseScore: number,
	accuracyBonus: number,
	highRepBonus: number,
	validationRate: number,
	updatedAt: string
};
	["ActiveJourney"]: {
		segments: Array<ModelTypes["PathSegment"]>,
	startTime: string,
	expectedEndTime: string
};
	["FavoriteConnection"]: {
		id: ModelTypes["ID"],
	name: string,
	startStopId: ModelTypes["ID"],
	endStopId: ModelTypes["ID"]
};
	["ActiveJourneyInput"]: {
	segments: Array<ModelTypes["PathSegmentInput"]>
};
	["PathSegmentInput"]: {
	from: ModelTypes["SegmentLocationInput"],
	to: ModelTypes["SegmentLocationInput"],
	lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	departureTime: string,
	arrivalTime: string,
	duration: number
};
	["SegmentLocationInput"]: {
	stopId: ModelTypes["ID"],
	stopName: string,
	coordinates: ModelTypes["CoordinatesInput"]
};
	["FavoriteConnectionInput"]: {
	name: string,
	startStopId: ModelTypes["ID"],
	endStopId: ModelTypes["ID"]
};
	["OperationResult"]: {
		success: boolean,
	message?: string | undefined | null
};
	["TwoFactorSetup"]: {
		secret: string,
	qrCode: string
};
	["Query"]: {
		me?: ModelTypes["User"] | undefined | null,
	incidentsByLine: Array<ModelTypes["Incident"]>,
	lines: Array<ModelTypes["Line"]>,
	stops: Array<ModelTypes["Stop"]>,
	findPath?: ModelTypes["JourneyPath"] | undefined | null,
	admin: ModelTypes["AdminQuery"]
};
	["AdminQuery"]: {
		users: ModelTypes["UserConnection"],
	user?: ModelTypes["User"] | undefined | null,
	incidents: ModelTypes["IncidentConnection"],
	incident?: ModelTypes["Incident"] | undefined | null,
	archivedIncidents: ModelTypes["IncidentConnection"],
	stats: ModelTypes["AdminStats"],
	lineIncidentStats: ModelTypes["LineIncidentStats"],
	lineDelayStats: ModelTypes["LineDelayStats"],
	topDelays: Array<ModelTypes["LineDelayRanking"]>,
	linesIncidentOverview: Array<ModelTypes["LineIncidentOverview"]>
};
	["AdminStats"]: {
		totalUsers: number,
	totalIncidents: number,
	activeIncidents: number,
	resolvedIncidents: number,
	fakeIncidents: number,
	usersByRole: ModelTypes["RoleStats"],
	incidentsByKind: Array<ModelTypes["KindStats"]>,
	averageReputation: number,
	averageTrustScore: number
};
	["RoleStats"]: {
		users: number,
	moderators: number,
	admins: number
};
	["KindStats"]: {
		kind: ModelTypes["IncidentKind"],
	count: number
};
	["UserConnection"]: {
		edges: Array<ModelTypes["UserEdge"]>,
	pageInfo: ModelTypes["PageInfo"],
	totalCount: number
};
	["UserEdge"]: {
		node: ModelTypes["User"],
	id: ModelTypes["ID"]
};
	["IncidentConnection"]: {
		edges: Array<ModelTypes["IncidentEdge"]>,
	pageInfo: ModelTypes["PageInfo"],
	totalCount: number
};
	["IncidentEdge"]: {
		node: ModelTypes["Incident"],
	id: ModelTypes["ID"]
};
	["PageInfo"]: {
		hasNextPage: boolean,
	hasPreviousPage: boolean,
	startCursor?: ModelTypes["ID"] | undefined | null,
	endCursor?: ModelTypes["ID"] | undefined | null
};
	["UserFilterInput"]: {
	role?: ModelTypes["UserRole"] | undefined | null,
	minReputation?: number | undefined | null,
	maxReputation?: number | undefined | null,
	minTrustScore?: number | undefined | null,
	maxTrustScore?: number | undefined | null,
	search?: string | undefined | null
};
	["IncidentFilterInput"]: {
	status?: ModelTypes["ReportStatus"] | undefined | null,
	kind?: ModelTypes["IncidentKind"] | undefined | null,
	lineId?: ModelTypes["ID"] | undefined | null,
	transportType?: ModelTypes["TransportType"] | undefined | null,
	isFake?: boolean | undefined | null,
	reportedBy?: ModelTypes["ID"] | undefined | null,
	dateFrom?: string | undefined | null,
	dateTo?: string | undefined | null
};
	["PaginationInput"]: {
	first?: number | undefined | null,
	after?: ModelTypes["ID"] | undefined | null,
	last?: number | undefined | null,
	before?: ModelTypes["ID"] | undefined | null
};
	["Mutation"]: {
		register: boolean,
	verifyEmail: boolean,
	resendVerificationEmail: boolean,
	setup2FA: ModelTypes["TwoFactorSetup"],
	verify2FA: boolean,
	disable2FA: boolean,
	createReport: ModelTypes["Incident"],
	updateReport: ModelTypes["Incident"],
	deleteReport: boolean,
	publishReport: ModelTypes["Incident"],
	resolveReport: ModelTypes["Incident"],
	setActiveJourney?: ModelTypes["ActiveJourney"] | undefined | null,
	clearActiveJourney: boolean,
	addFavoriteConnection: ModelTypes["ID"],
	removeFavoriteConnection: boolean,
	admin: ModelTypes["AdminMutation"]
};
	["AdminMutation"]: {
		createUser: ModelTypes["User"],
	updateUser: ModelTypes["User"],
	deleteUser: boolean,
	updateUserRole: ModelTypes["User"],
	updateUserReputation: ModelTypes["User"],
	createIncident: ModelTypes["Incident"],
	updateIncident: ModelTypes["Incident"],
	deleteIncident: boolean,
	markIncidentAsFake: ModelTypes["Incident"],
	restoreIncident: ModelTypes["Incident"],
	bulkResolveIncidents: Array<ModelTypes["Incident"]>,
	bulkDeleteIncidents: boolean
};
	["CreateUserInput"]: {
	name: string,
	email: string,
	password: string,
	role: ModelTypes["UserRole"],
	reputation?: number | undefined | null
};
	["UpdateUserInput"]: {
	name?: string | undefined | null,
	email?: string | undefined | null,
	password?: string | undefined | null,
	role?: ModelTypes["UserRole"] | undefined | null,
	reputation?: number | undefined | null
};
	["CreateAdminIncidentInput"]: {
	title: string,
	description?: string | undefined | null,
	kind: ModelTypes["IncidentKind"],
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null,
	affectedSegment?: ModelTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateAdminIncidentInput"]: {
	title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: ModelTypes["IncidentKind"] | undefined | null,
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null,
	affectedSegment?: ModelTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null,
	isFake?: boolean | undefined | null
};
	["IncidentSegmentInput"]: {
	startStopId: ModelTypes["ID"],
	endStopId: ModelTypes["ID"],
	lineId?: ModelTypes["ID"] | undefined | null
};
	["IncidentKind"]:IncidentKind;
	["TransportType"]:TransportType;
	["ReportStatus"]:ReportStatus;
	["Incident"]: {
		id: ModelTypes["ID"],
	title: string,
	description?: string | undefined | null,
	kind: ModelTypes["IncidentKind"],
	status: ModelTypes["ReportStatus"],
	lines?: Array<ModelTypes["Line"]> | undefined | null,
	affectedSegment?: ModelTypes["IncidentSegment"] | undefined | null,
	delayMinutes?: number | undefined | null,
	isFake?: boolean | undefined | null,
	reportedBy?: ModelTypes["ID"] | undefined | null,
	reporter?: ModelTypes["User"] | undefined | null,
	createdAt: string
};
	["IncidentSegment"]: {
		startStopId: ModelTypes["ID"],
	endStopId: ModelTypes["ID"],
	lineId?: ModelTypes["ID"] | undefined | null
};
	["Line"]: {
		id: ModelTypes["ID"],
	name: string,
	transportType: ModelTypes["TransportType"]
};
	["CreateReportInput"]: {
	description?: string | undefined | null,
	kind: ModelTypes["IncidentKind"],
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null,
	reporterLocation?: ModelTypes["CoordinatesInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateReportInput"]: {
	description?: string | undefined | null,
	kind?: ModelTypes["IncidentKind"] | undefined | null,
	status?: ModelTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<ModelTypes["ID"]> | undefined | null,
	delayMinutes?: number | undefined | null
};
	["Coordinates"]: {
		latitude: number,
	longitude: number
};
	["CoordinatesInput"]: {
	latitude: number,
	longitude: number
};
	["Stop"]: {
		id: ModelTypes["ID"],
	name: string,
	coordinates: ModelTypes["Coordinates"],
	transportType: ModelTypes["TransportType"]
};
	["SegmentLocation"]: {
		stopId: ModelTypes["ID"],
	stopName: string,
	coordinates: ModelTypes["Coordinates"]
};
	["PathSegment"]: {
		from: ModelTypes["SegmentLocation"],
	to: ModelTypes["SegmentLocation"],
	lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	departureTime: string,
	arrivalTime: string,
	duration: number,
	hasIncident: boolean
};
	["JourneyPath"]: {
		segments: Array<ModelTypes["PathSegment"]>,
	totalDuration: number,
	departureTime: string,
	arrivalTime: string,
	warnings: Array<string>,
	hasIncidents: boolean
};
	["FindPathInput"]: {
	from: ModelTypes["CoordinatesInput"],
	to: ModelTypes["CoordinatesInput"],
	departureTime?: string | undefined | null
};
	["Subscription"]: {
		incidentCreated: ModelTypes["Incident"],
	incidentUpdated: ModelTypes["Incident"],
	lineIncidentUpdates: ModelTypes["Incident"],
	myLinesIncidents: ModelTypes["Incident"],
	smartIncidentNotifications: ModelTypes["Incident"]
};
	["StatsPeriod"]:StatsPeriod;
	["LineIncidentStats"]: {
		lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	period: ModelTypes["StatsPeriod"],
	totalIncidents: number,
	incidentsByKind: Array<ModelTypes["IncidentKindCount"]>,
	averageDelayMinutes?: number | undefined | null,
	timeline: Array<ModelTypes["IncidentTimelineEntry"]>
};
	["IncidentKindCount"]: {
		kind: ModelTypes["IncidentKind"],
	count: number
};
	["IncidentTimelineEntry"]: {
		timestamp: string,
	incidentCount: number
};
	["LineDelayStats"]: {
		lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	period: ModelTypes["StatsPeriod"],
	totalDelays: number,
	averageDelayMinutes: number,
	maxDelayMinutes: number,
	minDelayMinutes: number,
	delayDistribution: Array<ModelTypes["DelayBucket"]>
};
	["DelayBucket"]: {
		rangeLabel: string,
	count: number
};
	["LineDelayRanking"]: {
		rank: number,
	lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	totalDelays: number,
	averageDelayMinutes: number,
	incidentCount: number
};
	["LineIncidentOverview"]: {
		lineId: ModelTypes["ID"],
	lineName: string,
	transportType: ModelTypes["TransportType"],
	incidentCount: number,
	lastIncidentTime?: string | undefined | null
};
	["schema"]: {
	query?: ModelTypes["Query"] | undefined | null,
	mutation?: ModelTypes["Mutation"] | undefined | null,
	subscription?: ModelTypes["Subscription"] | undefined | null
};
	["ID"]:any
    }

export type GraphQLTypes = {
    // Generic result type for operations;
	// Incidents by line (moved from nested UserQuery);
	// Transit queries;
	// Admin queries (ADMIN/MODERATOR only);
	// User management;
	// Incident management;
	// Archived incidents (RESOLVED status);
	// Statistics;
	// Reports and analytics;
	// Auth mutations;
	// Incident mutations;
	// User journey mutations;
	// Admin mutations (ADMIN/MODERATOR only);
	// User CRUD (ADMIN only);
	// Incident management (ADMIN/MODERATOR);
	// Geographic coordinates;
	// Smart notifications with deduplication and trust-based filtering;
	// Admin-only analytics types;
	["UserRole"]: UserRole;
	["User"]: {
	__typename: "User",
	id: GraphQLTypes["ID"],
	name: string,
	email: string,
	role: GraphQLTypes["UserRole"],
	reputation?: number | undefined | null,
	trustScore?: number | undefined | null,
	trustScoreBreakdown?: GraphQLTypes["TrustScoreBreakdown"] | undefined | null,
	activeJourney?: GraphQLTypes["ActiveJourney"] | undefined | null,
	['...on User']: Omit<GraphQLTypes["User"], "...on User">
};
	["TrustScoreBreakdown"]: {
	__typename: "TrustScoreBreakdown",
	baseScore: number,
	accuracyBonus: number,
	highRepBonus: number,
	validationRate: number,
	updatedAt: string,
	['...on TrustScoreBreakdown']: Omit<GraphQLTypes["TrustScoreBreakdown"], "...on TrustScoreBreakdown">
};
	["ActiveJourney"]: {
	__typename: "ActiveJourney",
	segments: Array<GraphQLTypes["PathSegment"]>,
	startTime: string,
	expectedEndTime: string,
	['...on ActiveJourney']: Omit<GraphQLTypes["ActiveJourney"], "...on ActiveJourney">
};
	["FavoriteConnection"]: {
	__typename: "FavoriteConnection",
	id: GraphQLTypes["ID"],
	name: string,
	startStopId: GraphQLTypes["ID"],
	endStopId: GraphQLTypes["ID"],
	['...on FavoriteConnection']: Omit<GraphQLTypes["FavoriteConnection"], "...on FavoriteConnection">
};
	["ActiveJourneyInput"]: {
		segments: Array<GraphQLTypes["PathSegmentInput"]>
};
	["PathSegmentInput"]: {
		from: GraphQLTypes["SegmentLocationInput"],
	to: GraphQLTypes["SegmentLocationInput"],
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	departureTime: string,
	arrivalTime: string,
	duration: number
};
	["SegmentLocationInput"]: {
		stopId: GraphQLTypes["ID"],
	stopName: string,
	coordinates: GraphQLTypes["CoordinatesInput"]
};
	["FavoriteConnectionInput"]: {
		name: string,
	startStopId: GraphQLTypes["ID"],
	endStopId: GraphQLTypes["ID"]
};
	["OperationResult"]: {
	__typename: "OperationResult",
	success: boolean,
	message?: string | undefined | null,
	['...on OperationResult']: Omit<GraphQLTypes["OperationResult"], "...on OperationResult">
};
	["TwoFactorSetup"]: {
	__typename: "TwoFactorSetup",
	secret: string,
	qrCode: string,
	['...on TwoFactorSetup']: Omit<GraphQLTypes["TwoFactorSetup"], "...on TwoFactorSetup">
};
	["Query"]: {
	__typename: "Query",
	me?: GraphQLTypes["User"] | undefined | null,
	incidentsByLine: Array<GraphQLTypes["Incident"]>,
	lines: Array<GraphQLTypes["Line"]>,
	stops: Array<GraphQLTypes["Stop"]>,
	findPath?: GraphQLTypes["JourneyPath"] | undefined | null,
	admin: GraphQLTypes["AdminQuery"],
	['...on Query']: Omit<GraphQLTypes["Query"], "...on Query">
};
	["AdminQuery"]: {
	__typename: "AdminQuery",
	users: GraphQLTypes["UserConnection"],
	user?: GraphQLTypes["User"] | undefined | null,
	incidents: GraphQLTypes["IncidentConnection"],
	incident?: GraphQLTypes["Incident"] | undefined | null,
	archivedIncidents: GraphQLTypes["IncidentConnection"],
	stats: GraphQLTypes["AdminStats"],
	lineIncidentStats: GraphQLTypes["LineIncidentStats"],
	lineDelayStats: GraphQLTypes["LineDelayStats"],
	topDelays: Array<GraphQLTypes["LineDelayRanking"]>,
	linesIncidentOverview: Array<GraphQLTypes["LineIncidentOverview"]>,
	['...on AdminQuery']: Omit<GraphQLTypes["AdminQuery"], "...on AdminQuery">
};
	["AdminStats"]: {
	__typename: "AdminStats",
	totalUsers: number,
	totalIncidents: number,
	activeIncidents: number,
	resolvedIncidents: number,
	fakeIncidents: number,
	usersByRole: GraphQLTypes["RoleStats"],
	incidentsByKind: Array<GraphQLTypes["KindStats"]>,
	averageReputation: number,
	averageTrustScore: number,
	['...on AdminStats']: Omit<GraphQLTypes["AdminStats"], "...on AdminStats">
};
	["RoleStats"]: {
	__typename: "RoleStats",
	users: number,
	moderators: number,
	admins: number,
	['...on RoleStats']: Omit<GraphQLTypes["RoleStats"], "...on RoleStats">
};
	["KindStats"]: {
	__typename: "KindStats",
	kind: GraphQLTypes["IncidentKind"],
	count: number,
	['...on KindStats']: Omit<GraphQLTypes["KindStats"], "...on KindStats">
};
	["UserConnection"]: {
	__typename: "UserConnection",
	edges: Array<GraphQLTypes["UserEdge"]>,
	pageInfo: GraphQLTypes["PageInfo"],
	totalCount: number,
	['...on UserConnection']: Omit<GraphQLTypes["UserConnection"], "...on UserConnection">
};
	["UserEdge"]: {
	__typename: "UserEdge",
	node: GraphQLTypes["User"],
	id: GraphQLTypes["ID"],
	['...on UserEdge']: Omit<GraphQLTypes["UserEdge"], "...on UserEdge">
};
	["IncidentConnection"]: {
	__typename: "IncidentConnection",
	edges: Array<GraphQLTypes["IncidentEdge"]>,
	pageInfo: GraphQLTypes["PageInfo"],
	totalCount: number,
	['...on IncidentConnection']: Omit<GraphQLTypes["IncidentConnection"], "...on IncidentConnection">
};
	["IncidentEdge"]: {
	__typename: "IncidentEdge",
	node: GraphQLTypes["Incident"],
	id: GraphQLTypes["ID"],
	['...on IncidentEdge']: Omit<GraphQLTypes["IncidentEdge"], "...on IncidentEdge">
};
	["PageInfo"]: {
	__typename: "PageInfo",
	hasNextPage: boolean,
	hasPreviousPage: boolean,
	startCursor?: GraphQLTypes["ID"] | undefined | null,
	endCursor?: GraphQLTypes["ID"] | undefined | null,
	['...on PageInfo']: Omit<GraphQLTypes["PageInfo"], "...on PageInfo">
};
	["UserFilterInput"]: {
		role?: GraphQLTypes["UserRole"] | undefined | null,
	minReputation?: number | undefined | null,
	maxReputation?: number | undefined | null,
	minTrustScore?: number | undefined | null,
	maxTrustScore?: number | undefined | null,
	search?: string | undefined | null
};
	["IncidentFilterInput"]: {
		status?: GraphQLTypes["ReportStatus"] | undefined | null,
	kind?: GraphQLTypes["IncidentKind"] | undefined | null,
	lineId?: GraphQLTypes["ID"] | undefined | null,
	transportType?: GraphQLTypes["TransportType"] | undefined | null,
	isFake?: boolean | undefined | null,
	reportedBy?: GraphQLTypes["ID"] | undefined | null,
	dateFrom?: string | undefined | null,
	dateTo?: string | undefined | null
};
	["PaginationInput"]: {
		first?: number | undefined | null,
	after?: GraphQLTypes["ID"] | undefined | null,
	last?: number | undefined | null,
	before?: GraphQLTypes["ID"] | undefined | null
};
	["Mutation"]: {
	__typename: "Mutation",
	register: boolean,
	verifyEmail: boolean,
	resendVerificationEmail: boolean,
	setup2FA: GraphQLTypes["TwoFactorSetup"],
	verify2FA: boolean,
	disable2FA: boolean,
	createReport: GraphQLTypes["Incident"],
	updateReport: GraphQLTypes["Incident"],
	deleteReport: boolean,
	publishReport: GraphQLTypes["Incident"],
	resolveReport: GraphQLTypes["Incident"],
	setActiveJourney?: GraphQLTypes["ActiveJourney"] | undefined | null,
	clearActiveJourney: boolean,
	addFavoriteConnection: GraphQLTypes["ID"],
	removeFavoriteConnection: boolean,
	admin: GraphQLTypes["AdminMutation"],
	['...on Mutation']: Omit<GraphQLTypes["Mutation"], "...on Mutation">
};
	["AdminMutation"]: {
	__typename: "AdminMutation",
	createUser: GraphQLTypes["User"],
	updateUser: GraphQLTypes["User"],
	deleteUser: boolean,
	updateUserRole: GraphQLTypes["User"],
	updateUserReputation: GraphQLTypes["User"],
	createIncident: GraphQLTypes["Incident"],
	updateIncident: GraphQLTypes["Incident"],
	deleteIncident: boolean,
	markIncidentAsFake: GraphQLTypes["Incident"],
	restoreIncident: GraphQLTypes["Incident"],
	bulkResolveIncidents: Array<GraphQLTypes["Incident"]>,
	bulkDeleteIncidents: boolean,
	['...on AdminMutation']: Omit<GraphQLTypes["AdminMutation"], "...on AdminMutation">
};
	["CreateUserInput"]: {
		name: string,
	email: string,
	password: string,
	role: GraphQLTypes["UserRole"],
	reputation?: number | undefined | null
};
	["UpdateUserInput"]: {
		name?: string | undefined | null,
	email?: string | undefined | null,
	password?: string | undefined | null,
	role?: GraphQLTypes["UserRole"] | undefined | null,
	reputation?: number | undefined | null
};
	["CreateAdminIncidentInput"]: {
		title: string,
	description?: string | undefined | null,
	kind: GraphQLTypes["IncidentKind"],
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null,
	affectedSegment?: GraphQLTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateAdminIncidentInput"]: {
		title?: string | undefined | null,
	description?: string | undefined | null,
	kind?: GraphQLTypes["IncidentKind"] | undefined | null,
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null,
	affectedSegment?: GraphQLTypes["IncidentSegmentInput"] | undefined | null,
	delayMinutes?: number | undefined | null,
	isFake?: boolean | undefined | null
};
	["IncidentSegmentInput"]: {
		startStopId: GraphQLTypes["ID"],
	endStopId: GraphQLTypes["ID"],
	lineId?: GraphQLTypes["ID"] | undefined | null
};
	["IncidentKind"]: IncidentKind;
	["TransportType"]: TransportType;
	["ReportStatus"]: ReportStatus;
	["Incident"]: {
	__typename: "Incident",
	id: GraphQLTypes["ID"],
	title: string,
	description?: string | undefined | null,
	kind: GraphQLTypes["IncidentKind"],
	status: GraphQLTypes["ReportStatus"],
	lines?: Array<GraphQLTypes["Line"]> | undefined | null,
	affectedSegment?: GraphQLTypes["IncidentSegment"] | undefined | null,
	delayMinutes?: number | undefined | null,
	isFake?: boolean | undefined | null,
	reportedBy?: GraphQLTypes["ID"] | undefined | null,
	reporter?: GraphQLTypes["User"] | undefined | null,
	createdAt: string,
	['...on Incident']: Omit<GraphQLTypes["Incident"], "...on Incident">
};
	["IncidentSegment"]: {
	__typename: "IncidentSegment",
	startStopId: GraphQLTypes["ID"],
	endStopId: GraphQLTypes["ID"],
	lineId?: GraphQLTypes["ID"] | undefined | null,
	['...on IncidentSegment']: Omit<GraphQLTypes["IncidentSegment"], "...on IncidentSegment">
};
	["Line"]: {
	__typename: "Line",
	id: GraphQLTypes["ID"],
	name: string,
	transportType: GraphQLTypes["TransportType"],
	['...on Line']: Omit<GraphQLTypes["Line"], "...on Line">
};
	["CreateReportInput"]: {
		description?: string | undefined | null,
	kind: GraphQLTypes["IncidentKind"],
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null,
	reporterLocation?: GraphQLTypes["CoordinatesInput"] | undefined | null,
	delayMinutes?: number | undefined | null
};
	["UpdateReportInput"]: {
		description?: string | undefined | null,
	kind?: GraphQLTypes["IncidentKind"] | undefined | null,
	status?: GraphQLTypes["ReportStatus"] | undefined | null,
	lineIds?: Array<GraphQLTypes["ID"]> | undefined | null,
	delayMinutes?: number | undefined | null
};
	["Coordinates"]: {
	__typename: "Coordinates",
	latitude: number,
	longitude: number,
	['...on Coordinates']: Omit<GraphQLTypes["Coordinates"], "...on Coordinates">
};
	["CoordinatesInput"]: {
		latitude: number,
	longitude: number
};
	["Stop"]: {
	__typename: "Stop",
	id: GraphQLTypes["ID"],
	name: string,
	coordinates: GraphQLTypes["Coordinates"],
	transportType: GraphQLTypes["TransportType"],
	['...on Stop']: Omit<GraphQLTypes["Stop"], "...on Stop">
};
	["SegmentLocation"]: {
	__typename: "SegmentLocation",
	stopId: GraphQLTypes["ID"],
	stopName: string,
	coordinates: GraphQLTypes["Coordinates"],
	['...on SegmentLocation']: Omit<GraphQLTypes["SegmentLocation"], "...on SegmentLocation">
};
	["PathSegment"]: {
	__typename: "PathSegment",
	from: GraphQLTypes["SegmentLocation"],
	to: GraphQLTypes["SegmentLocation"],
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	departureTime: string,
	arrivalTime: string,
	duration: number,
	hasIncident: boolean,
	['...on PathSegment']: Omit<GraphQLTypes["PathSegment"], "...on PathSegment">
};
	["JourneyPath"]: {
	__typename: "JourneyPath",
	segments: Array<GraphQLTypes["PathSegment"]>,
	totalDuration: number,
	departureTime: string,
	arrivalTime: string,
	warnings: Array<string>,
	hasIncidents: boolean,
	['...on JourneyPath']: Omit<GraphQLTypes["JourneyPath"], "...on JourneyPath">
};
	["FindPathInput"]: {
		from: GraphQLTypes["CoordinatesInput"],
	to: GraphQLTypes["CoordinatesInput"],
	departureTime?: string | undefined | null
};
	["Subscription"]: {
	__typename: "Subscription",
	incidentCreated: GraphQLTypes["Incident"],
	incidentUpdated: GraphQLTypes["Incident"],
	lineIncidentUpdates: GraphQLTypes["Incident"],
	myLinesIncidents: GraphQLTypes["Incident"],
	smartIncidentNotifications: GraphQLTypes["Incident"],
	['...on Subscription']: Omit<GraphQLTypes["Subscription"], "...on Subscription">
};
	["StatsPeriod"]: StatsPeriod;
	["LineIncidentStats"]: {
	__typename: "LineIncidentStats",
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	period: GraphQLTypes["StatsPeriod"],
	totalIncidents: number,
	incidentsByKind: Array<GraphQLTypes["IncidentKindCount"]>,
	averageDelayMinutes?: number | undefined | null,
	timeline: Array<GraphQLTypes["IncidentTimelineEntry"]>,
	['...on LineIncidentStats']: Omit<GraphQLTypes["LineIncidentStats"], "...on LineIncidentStats">
};
	["IncidentKindCount"]: {
	__typename: "IncidentKindCount",
	kind: GraphQLTypes["IncidentKind"],
	count: number,
	['...on IncidentKindCount']: Omit<GraphQLTypes["IncidentKindCount"], "...on IncidentKindCount">
};
	["IncidentTimelineEntry"]: {
	__typename: "IncidentTimelineEntry",
	timestamp: string,
	incidentCount: number,
	['...on IncidentTimelineEntry']: Omit<GraphQLTypes["IncidentTimelineEntry"], "...on IncidentTimelineEntry">
};
	["LineDelayStats"]: {
	__typename: "LineDelayStats",
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	period: GraphQLTypes["StatsPeriod"],
	totalDelays: number,
	averageDelayMinutes: number,
	maxDelayMinutes: number,
	minDelayMinutes: number,
	delayDistribution: Array<GraphQLTypes["DelayBucket"]>,
	['...on LineDelayStats']: Omit<GraphQLTypes["LineDelayStats"], "...on LineDelayStats">
};
	["DelayBucket"]: {
	__typename: "DelayBucket",
	rangeLabel: string,
	count: number,
	['...on DelayBucket']: Omit<GraphQLTypes["DelayBucket"], "...on DelayBucket">
};
	["LineDelayRanking"]: {
	__typename: "LineDelayRanking",
	rank: number,
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	totalDelays: number,
	averageDelayMinutes: number,
	incidentCount: number,
	['...on LineDelayRanking']: Omit<GraphQLTypes["LineDelayRanking"], "...on LineDelayRanking">
};
	["LineIncidentOverview"]: {
	__typename: "LineIncidentOverview",
	lineId: GraphQLTypes["ID"],
	lineName: string,
	transportType: GraphQLTypes["TransportType"],
	incidentCount: number,
	lastIncidentTime?: string | undefined | null,
	['...on LineIncidentOverview']: Omit<GraphQLTypes["LineIncidentOverview"], "...on LineIncidentOverview">
};
	["ID"]: "scalar" & { name: "ID" }
    }
export enum UserRole {
	USER = "USER",
	ADMIN = "ADMIN"
}
export enum IncidentKind {
	INCIDENT = "INCIDENT",
	NETWORK_FAILURE = "NETWORK_FAILURE",
	VEHICLE_FAILURE = "VEHICLE_FAILURE",
	ACCIDENT = "ACCIDENT",
	TRAFFIC_JAM = "TRAFFIC_JAM",
	PLATFORM_CHANGES = "PLATFORM_CHANGES"
}
export enum TransportType {
	BUS = "BUS",
	RAIL = "RAIL"
}
export enum ReportStatus {
	DRAFT = "DRAFT",
	PUBLISHED = "PUBLISHED",
	RESOLVED = "RESOLVED"
}
export enum StatsPeriod {
	LAST_24H = "LAST_24H",
	LAST_7D = "LAST_7D",
	LAST_31D = "LAST_31D"
}

type ZEUS_VARIABLES = {
	["UserRole"]: ValueTypes["UserRole"];
	["ActiveJourneyInput"]: ValueTypes["ActiveJourneyInput"];
	["PathSegmentInput"]: ValueTypes["PathSegmentInput"];
	["SegmentLocationInput"]: ValueTypes["SegmentLocationInput"];
	["FavoriteConnectionInput"]: ValueTypes["FavoriteConnectionInput"];
	["UserFilterInput"]: ValueTypes["UserFilterInput"];
	["IncidentFilterInput"]: ValueTypes["IncidentFilterInput"];
	["PaginationInput"]: ValueTypes["PaginationInput"];
	["CreateUserInput"]: ValueTypes["CreateUserInput"];
	["UpdateUserInput"]: ValueTypes["UpdateUserInput"];
	["CreateAdminIncidentInput"]: ValueTypes["CreateAdminIncidentInput"];
	["UpdateAdminIncidentInput"]: ValueTypes["UpdateAdminIncidentInput"];
	["IncidentSegmentInput"]: ValueTypes["IncidentSegmentInput"];
	["IncidentKind"]: ValueTypes["IncidentKind"];
	["TransportType"]: ValueTypes["TransportType"];
	["ReportStatus"]: ValueTypes["ReportStatus"];
	["CreateReportInput"]: ValueTypes["CreateReportInput"];
	["UpdateReportInput"]: ValueTypes["UpdateReportInput"];
	["CoordinatesInput"]: ValueTypes["CoordinatesInput"];
	["FindPathInput"]: ValueTypes["FindPathInput"];
	["StatsPeriod"]: ValueTypes["StatsPeriod"];
	["ID"]: ValueTypes["ID"];
}