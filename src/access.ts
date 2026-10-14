// Whether her Rewire access is open, by the same rule as the Rewire app.
// accessOf, latestGrant, isLive and planRow are copied from Rewire's
// src/lib/billing/plan.ts (../rinaya-rewire): change them there first, then
// copy them here unchanged, the same way rinaya.org copies them.

import { prisma } from "./prisma";

// Plans that renew by themselves (weekly); Sprint is one payment for 4 weeks.
const AUTO_RENEW = new Set<string>(["trial", "core", "private"]);
// CyberSource charges renewals in a 2am batch and rinaya.org then moves
// current_period_end on; this covers the gap so nobody is locked out overnight.
const RENEWAL_GRACE_MS = 2 * 24 * 60 * 60 * 1000;

export type Blocked = "none" | "ended" | "payment";

type SubRow = { plan: string; status: string; current_period_end: Date };
type PlanRow = SubRow & { pending_plan: string | null };

export function accessOf(sub: SubRow | null, now = Date.now()): Blocked | null {
  if (!sub) return "none";
  const end = sub.current_period_end.getTime();
  switch (sub.status) {
    case "suspended": return "payment";
    case "cancelled": return now < end ? null : "ended"; // paid through the period
    case "active": return now < end + (AUTO_RENEW.has(sub.plan) ? RENEWAL_GRACE_MS : 0) ? null : "ended";
    case "granted": return now < end ? null : "ended"; // given by an admin, no grace
    default: return "ended";
  }
}

type GrantRow = { plan: string; ends_at: Date; revoked_at: Date | null };

// The grant that counts among hers: the latest-ending one not ended early.
export function latestGrant<G extends GrantRow>(grants: G[]): G | null {
  let best: G | null = null;
  for (const g of grants) if (!g.revoked_at && (!best || g.ends_at > best.ends_at)) best = g;
  return best;
}

export function isLive(g: GrantRow | null, now = Date.now()): boolean {
  return !!g && !g.revoked_at && g.ends_at.getTime() > now;
}

// Her plan as access reads it: a live grant, then her paid plan, then a grant that ran out.
export function planRow(sub: PlanRow | null, grant: GrantRow | null, now = Date.now()): PlanRow | null {
  const status = isLive(grant, now) ? "granted" : !sub && grant && !grant.revoked_at ? "ended" : null;
  if (grant && status) return { plan: grant.plan, status, current_period_end: grant.ends_at, pending_plan: null };
  return sub;
}

// ---------- the bot's own reads ----------

// Which of these accounts have open access, in two queries.
export async function openAccess(userIds: number[]): Promise<Set<number>> {
  if (!userIds.length) return new Set();
  const [subs, grants] = await Promise.all([
    prisma.rewire_subscriptions.findMany({ where: { user_id: { in: userIds } } }),
    prisma.rewire_grants.findMany({ where: { user_id: { in: userIds }, revoked_at: null } }),
  ]);
  const subOf = new Map(subs.map((s) => [s.user_id, s]));
  const open = new Set<number>();
  for (const id of userIds) {
    const row = planRow(subOf.get(id) ?? null, latestGrant(grants.filter((g) => g.user_id === id)));
    if (accessOf(row) === null) open.add(id);
  }
  return open;
}

export async function isOpen(userId: number): Promise<boolean> {
  return (await openAccess([userId])).has(userId);
}
