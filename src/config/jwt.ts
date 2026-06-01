export const jwtConfig = {
  secret: process.env.JWT_SECRET ?? 'change-me-in-production',
  expiresIn: '7d' as const,
};
