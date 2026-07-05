export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET environment variable is required in production");
    }
    console.warn("[Auth] JWT_SECRET not set — using development fallback. Do not use in production.");
    return "dev-only-resolvebridge-secret";
  }
  return secret;
}

export const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
