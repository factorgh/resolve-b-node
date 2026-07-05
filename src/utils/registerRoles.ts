/** Roles users may self-assign during public registration */
export const SELF_REGISTER_ROLES = new Set([
  "Customer",
  "BankAdmin",
  "BNPLAdmin",
  "InsuranceAdmin",
]);

export function resolveRegistrationRole(requestedRole?: string): string {
  if (!requestedRole || !SELF_REGISTER_ROLES.has(requestedRole)) {
    return "Customer";
  }
  return requestedRole;
}
