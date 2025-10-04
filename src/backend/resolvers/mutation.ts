interface RegisterInput {
  email: string;
  password: string;
  name: string;
}

interface Verify2FAInput {
  token: string;
  secret: string;
}

export const Mutation = {
  register: (_: unknown, { input }: { input: RegisterInput }) => ({
    success: true,
    message: "registered (mock)",
    userId: null,
  }),
  verifyEmail: (_: unknown, { token }: { token: string }) => ({
    success: true,
    message: "verified (mock)",
  }),
  resendVerificationEmail: (_: unknown, { email }: { email: string }) => ({
    success: true,
    message: "resent (mock)",
  }),
  setup2FA: () => ({ secret: "mock-secret", qrCode: "mock-qrcode" }),
  verify2FA: (_: unknown, { token, secret }: Verify2FAInput) => ({
    success: true,
    message: "2FA verified (mock)",
  }),
  disable2FA: () => ({ success: true, message: "2FA disabled (mock)" }),
  carrierMutations: () => ({}),
  userMutations: () => ({}),
};

export default Mutation;
