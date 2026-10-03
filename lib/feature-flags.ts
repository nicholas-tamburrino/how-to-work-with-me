/**
 * Feature flags. Add Stripe (or other paid features) here without refactoring call sites.
 */
export const isStripeEnabled =
  process.env.NEXT_PUBLIC_STRIPE_ENABLED === "true";

// When Stripe is enabled: gate manual generation or PDF export behind checkout
// e.g. if (isStripeEnabled && !hasActiveSubscription(userId)) redirect to pricing
export function requireStripeSubscription(userId: string): boolean {
  void userId;
  if (!isStripeEnabled) return true;
  // TODO: check Stripe subscription when enabled
  return true;
}
