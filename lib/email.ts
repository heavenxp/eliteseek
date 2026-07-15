/**
 * Email notifications — best-effort, never throws.
 * All exported functions return void and swallow errors internally.
 */

import { Resend } from "resend";

function getResend(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

const FROM = "EliteSeek <notifications@eliteseek.com>";

// ── Templates ────────────────────────────────────────────────────────────────

function baseLayout(content: string) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>EliteSeek</title>
  <style>
    body { margin: 0; padding: 0; background: #080810; font-family: 'DM Sans', Arial, sans-serif; color: #c9c2b4; }
    .wrapper { max-width: 560px; margin: 40px auto; background: #0f0f1a; border: 1px solid rgba(76,158,255,0.15); border-radius: 16px; overflow: hidden; }
    .header { padding: 28px 32px 20px; border-bottom: 1px solid rgba(76,158,255,0.1); }
    .logo { font-size: 22px; font-weight: 300; color: #4c9eff; letter-spacing: 0.04em; }
    .body { padding: 28px 32px; }
    h2 { margin: 0 0 12px; font-size: 20px; font-weight: 300; color: #e8e2d9; }
    p { margin: 0 0 14px; font-size: 14px; line-height: 1.6; color: #9a9080; }
    .detail-box { background: rgba(76,158,255,0.06); border: 1px solid rgba(76,158,255,0.1); border-radius: 10px; padding: 16px 20px; margin: 18px 0; }
    .detail-row { display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 8px; }
    .detail-row:last-child { margin-bottom: 0; }
    .detail-label { color: #6b6358; }
    .detail-value { color: #c9c2b4; }
    .cta { display: inline-block; margin-top: 4px; padding: 12px 24px; background: #4c9eff; color: #080810; border-radius: 10px; font-size: 14px; font-weight: 500; text-decoration: none; }
    .footer { padding: 16px 32px; border-top: 1px solid rgba(76,158,255,0.08); font-size: 11px; color: #403830; text-align: center; }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <span class="logo">EliteSeek</span>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      You are receiving this because you have an EliteSeek account. &copy; ${new Date().getFullYear()} EliteSeek.
    </div>
  </div>
</body>
</html>`;
}

// ── Exported functions ───────────────────────────────────────────────────────

/** Notify a companion of a new booking request from a client. */
export async function sendBookingRequestEmail({
  companionEmail,
  companionName,
  clientName,
  bookingType,
  scheduledAt,
  durationHours,
  totalAmount,
}: {
  companionEmail: string;
  companionName: string;
  clientName: string;
  bookingType: string;
  scheduledAt: string;
  durationHours: number;
  totalAmount: number;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dateStr = new Date(scheduledAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = baseLayout(`
    <h2>New Booking Request</h2>
    <p>Hello ${companionName}, you have received a new booking request.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">From</span><span class="detail-value">${clientName}</span></div>
      <div class="detail-row"><span class="detail-label">Type</span><span class="detail-value">${bookingType.charAt(0).toUpperCase() + bookingType.slice(1)}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Duration</span><span class="detail-value">${durationHours} hour${durationHours !== 1 ? "s" : ""}</span></div>
      <div class="detail-row"><span class="detail-label">Amount</span><span class="detail-value">$${totalAmount.toFixed(2)}</span></div>
    </div>
    <p>Log in to accept or decline this request.</p>
    <a href="https://eliteseek.com/companion/bookings" class="cta">View Request</a>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: companionEmail,
      subject: `New booking request from ${clientName}`,
      html,
    });
  } catch (err) {
    console.error("[email] sendBookingRequestEmail failed:", err);
  }
}

/** Notify a client of the companion's response to their booking request. */
export async function sendBookingResponseEmail({
  clientEmail,
  clientName,
  companionName,
  status,
  scheduledAt,
}: {
  clientEmail: string;
  clientName: string;
  companionName: string;
  status: "confirmed" | "cancelled";
  scheduledAt: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const dateStr = new Date(scheduledAt).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const isConfirmed = status === "confirmed";

  const html = baseLayout(`
    <h2>${isConfirmed ? "Booking Confirmed" : "Booking Declined"}</h2>
    <p>Hello ${clientName},</p>
    ${
      isConfirmed
        ? `<p>Great news — <strong style="color:#4c9eff">${companionName}</strong> has confirmed your booking.</p>`
        : `<p><strong style="color:#c9c2b4">${companionName}</strong> was unable to accommodate your booking request at this time.</p>`
    }
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Host</span><span class="detail-value">${companionName}</span></div>
      <div class="detail-row"><span class="detail-label">Date</span><span class="detail-value">${dateStr}</span></div>
      <div class="detail-row"><span class="detail-label">Status</span><span class="detail-value" style="color:${isConfirmed ? "#4ade80" : "#f87171"}">${isConfirmed ? "Confirmed" : "Declined"}</span></div>
    </div>
    ${isConfirmed ? '<a href="https://eliteseek.com/bookings" class="cta">View Booking</a>' : "<p>Feel free to explore other available hosts.</p>"}
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: clientEmail,
      subject: isConfirmed
        ? `Your booking with ${companionName} is confirmed`
        : `Update on your booking request`,
      html,
    });
  } catch (err) {
    console.error("[email] sendBookingResponseEmail failed:", err);
  }
}

/** Confirm a client's subscription to a companion. */
export async function sendSubscriptionConfirmationEmail({
  clientEmail,
  clientName,
  companionName,
  pricePerMonth,
  periodEnd,
}: {
  clientEmail: string;
  clientName: string;
  companionName: string;
  pricePerMonth: number;
  periodEnd: string;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const endStr = new Date(periodEnd).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const html = baseLayout(`
    <h2>Subscription Active</h2>
    <p>Hello ${clientName}, you are now subscribed to <strong style="color:#4c9eff">${companionName}</strong>'s exclusive content.</p>
    <div class="detail-box">
      <div class="detail-row"><span class="detail-label">Host</span><span class="detail-value">${companionName}</span></div>
      <div class="detail-row"><span class="detail-label">Monthly Rate</span><span class="detail-value">$${pricePerMonth.toFixed(2)} / month</span></div>
      <div class="detail-row"><span class="detail-label">Next Renewal</span><span class="detail-value">${endStr}</span></div>
    </div>
    <a href="https://eliteseek.com/membership" class="cta">Manage Subscription</a>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: clientEmail,
      subject: `You're now subscribed to ${companionName}`,
      html,
    });
  } catch (err) {
    console.error("[email] sendSubscriptionConfirmationEmail failed:", err);
  }
}

/** Notify a client that their profile access request has been approved. */
export async function sendAccessApprovalEmail({
  clientEmail,
  clientName,
  companionName,
  companionUsername,
}: {
  clientEmail: string;
  clientName: string;
  companionName: string;
  companionUsername?: string | null;
}): Promise<void> {
  const resend = getResend();
  if (!resend) return;

  const profileUrl = companionUsername
    ? `https://eliteseek.com/@${companionUsername}`
    : "https://eliteseek.com";

  const html = baseLayout(`
    <h2>Profile Access Granted</h2>
    <p>Hello ${clientName}, your request to view <strong style="color:#4c9eff">${companionName}</strong>'s private profile has been approved.</p>
    <p>You now have full access to their portfolio, availability, and contact details.</p>
    <a href="${profileUrl}" class="cta">View Profile</a>
  `);

  try {
    await resend.emails.send({
      from: FROM,
      to: clientEmail,
      subject: `${companionName} approved your access request`,
      html,
    });
  } catch (err) {
    console.error("[email] sendAccessApprovalEmail failed:", err);
  }
}
