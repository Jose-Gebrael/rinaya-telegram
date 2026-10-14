import { describe, expect, it } from "vitest";
import { sweepAction } from "../src/sweep";

const base = { inGroup: true, isAdmin: false, connected: true, open: true, status: "member", graceOver: false };

describe("sweepAction", () => {
  it("leaves a connected member with open access alone", () => {
    expect(sweepAction(base)).toBe(null);
  });
  it("removes a connected member whose access closed", () => {
    expect(sweepAction({ ...base, open: false })).toBe("remove-closed");
  });
  it("never touches an admin", () => {
    expect(sweepAction({ ...base, isAdmin: true, open: false })).toBe(null);
    expect(sweepAction({ ...base, isAdmin: true, connected: false, graceOver: true })).toBe(null);
  });
  it("welcomes back a removed member whose access is open again", () => {
    expect(sweepAction({ ...base, inGroup: false, status: "suspended" })).toBe("welcome-back");
    expect(sweepAction({ ...base, inGroup: false, status: "suspended", open: false })).toBe(null);
  });
  it("doesn't welcome back someone who left by herself", () => {
    expect(sweepAction({ ...base, inGroup: false, status: "left" })).toBe(null);
  });
  it("keeps members who never connected until the grace period is over", () => {
    const unconnected = { ...base, connected: false, open: false, status: null };
    expect(sweepAction(unconnected)).toBe(null);
    expect(sweepAction({ ...unconnected, graceOver: true })).toBe("remove-not-connected");
    expect(sweepAction({ ...unconnected, inGroup: false, graceOver: true })).toBe(null);
  });
});
