import { GrammyError, HttpError, type Api, type RawApi } from "grammy";
import { describe, expect, it } from "vitest";
import { memberNow } from "../src/group";

// An api whose getChatMember fails with this error.
const failing = (err: Error) => ({ getChatMember: () => Promise.reject(err) }) as unknown as Api<RawApi>;
const apiError = (error_code: number, description: string) =>
  new GrammyError(`Call to 'getChatMember' failed!`, { ok: false, error_code, description }, "getChatMember", {});

describe("memberNow", () => {
  it("returns her membership when Telegram answers", async () => {
    const member = { status: "member", user: { id: 1, is_bot: false, first_name: "A" } };
    const api = { getChatMember: () => Promise.resolve(member) } as unknown as Api<RawApi>;
    expect(await memberNow(api, 1)).toBe(member);
  });
  it("returns null when Telegram doesn't know her (a 400)", async () => {
    expect(await memberNow(failing(apiError(400, "Bad Request: user not found")), 1)).toBe(null);
  });
  it("throws on a rate limit, so the sweep doesn't take her for gone", async () => {
    await expect(memberNow(failing(apiError(429, "Too Many Requests: retry after 5")), 1)).rejects.toThrow(GrammyError);
  });
  it("throws on a network failure", async () => {
    await expect(memberNow(failing(new HttpError("Network request failed", new Error("ECONNRESET"))), 1)).rejects.toThrow(HttpError);
  });
});
