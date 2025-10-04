export const Query = {
  me: () => null,
  check2FAStatus: (_: any, { username }: any) => ({
    requires2FA: false,
    userExists: false,
  }),
  userQuery: (_: any, { id }: any, ctx: any) => {
    return {};
  },
};

export default Query;
