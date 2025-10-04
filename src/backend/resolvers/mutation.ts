export const Mutation = {
  register: (_: any, { input }: any) => ({
    success: true,
    message: "registered (mock)",
    userId: null,
  }),
  verifyEmail: (_: any, { token }: any) => ({
    success: true,
    message: "verified (mock)",
  }),
  resendVerificationEmail: (_: any, { email }: any) => ({
    success: true,
    message: "resent (mock)",
  }),
  setup2FA: () => ({ secret: "mock-secret", qrCode: "mock-qrcode" }),
  verify2FA: (_: any, { token, secret }: any) => ({
    success: true,
    message: "2FA verified (mock)",
  }),
  disable2FA: () => ({ success: true, message: "2FA disabled (mock)" }),
  carrierMutations: () => ({}),
};

export default Mutation;
