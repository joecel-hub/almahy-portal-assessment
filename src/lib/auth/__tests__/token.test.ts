// @vitest-environment node
// Server-side code: run in Node, not the browser-like jsdom environment.
import { beforeAll, describe, expect, it } from "vitest";
import { signSession, verifySession, type Session } from "../token";

const session: Session = { userId: 7, name: "Omar Al-Harbi", email: "manager@almahy.demo", role: "manager" };

describe("session token", () => {
  beforeAll(() => {
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
  });

  it("round-trips a signed session", async () => {
    const token = await signSession(session);
    await expect(verifySession(token)).resolves.toEqual(session);
  });

  it("rejects a tampered token", async () => {
    const token = await signSession(session);
    const [header, , signature] = token.split(".");
    const forgedPayload = Buffer.from(JSON.stringify({ sub: "7", role: "admin" })).toString("base64url");
    await expect(verifySession(`${header}.${forgedPayload}.${signature}`)).resolves.toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const token = await signSession(session);
    process.env.AUTH_SECRET = "another-secret-that-is-at-least-32-characters";
    await expect(verifySession(token)).resolves.toBeNull();
    process.env.AUTH_SECRET = "test-secret-that-is-at-least-32-characters-long";
  });

  it("treats a missing cookie as signed out", async () => {
    await expect(verifySession(undefined)).resolves.toBeNull();
  });
});
