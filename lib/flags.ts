// Feature flags.
//
// GIFTING: cut from launch scope (see PHASES.md "Cut from scope") — this exact
// feature pattern got WishTender terminated by Stripe. DB tables remain, all UI
// and server surface is gated here. Do not re-enable without processor sign-off.
export const GIFTING_ENABLED = false;
