import { describe, expect, it } from "vitest";
import { accessOf, latestGrant, planRow } from "../src/access";

const day = 24 * 60 * 60 * 1000;
const now = Date.UTC(2026, 9, 14, 12);
const sub = (status: string, endsIn: number, plan = "core") => ({ plan, status, current_period_end: new Date(now + endsIn), pending_plan: null });

// The same rule as Rewire's src/lib/billing/plan.ts.
describe("accessOf", () => {
  it("is closed without a plan", () => expect(accessOf(null, now)).toBe("none"));
  it("keeps a weekly plan open 2 days past its period for the renewal", () => {
    expect(accessOf(sub("active", -1 * day), now)).toBe(null);
    expect(accessOf(sub("active", -3 * day), now)).toBe("ended");
  });
  it("gives Sprint no renewal grace", () => expect(accessOf(sub("active", -1, "sprint"), now)).toBe("ended"));
  it("keeps a cancelled plan open until its period ends", () => {
    expect(accessOf(sub("cancelled", day), now)).toBe(null);
    expect(accessOf(sub("cancelled", -1), now)).toBe("ended");
  });
  it("closes on a failed renewal", () => expect(accessOf(sub("suspended", day), now)).toBe("payment"));
});

describe("grants", () => {
  const grant = (endsIn: number, revoked = false) => ({ plan: "private", ends_at: new Date(now + endsIn), revoked_at: revoked ? new Date(now) : null });
  it("a live grant opens access over an ended plan", () => {
    expect(accessOf(planRow(sub("ended", -10 * day), latestGrant([grant(day)]), now), now)).toBe(null);
  });
  it("a revoked grant is ignored", () => {
    expect(accessOf(planRow(null, latestGrant([grant(day, true)]), now), now)).toBe("none");
  });
  it("a grant that ran out reads as ended", () => {
    expect(accessOf(planRow(null, latestGrant([grant(-day)]), now), now)).toBe("ended");
  });
});
