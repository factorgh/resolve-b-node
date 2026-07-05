import { IUser } from "../models/user.model";

const SENSITIVE_USER_FIELDS = ["password", "__v"] as const;

export function sanitizeUser(user: IUser | Record<string, any> | null | undefined) {
  if (!user) return null;
  const obj =
    typeof (user as any).toObject === "function"
      ? (user as IUser).toObject()
      : { ...(user as Record<string, any>) };

  for (const field of SENSITIVE_USER_FIELDS) {
    delete obj[field];
  }
  return obj;
}

export function sanitizeInstitution(
  institution: Record<string, any> | null | undefined,
) {
  if (!institution) return null;
  const obj =
    typeof institution.toObject === "function"
      ? institution.toObject()
      : { ...institution };

  delete obj.coreBankingAuthToken;
  delete obj.coreBankingWebhookSecret;
  delete obj.paystackAuthorizationCode;
  return obj;
}
