import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { verifyDiditSignature } from "./didit.js";

function sign(secret: string, ts: string, sessionId: string, status: string, webhookType: string) {
  const manifest = `${ts}:${sessionId}:${status}:${webhookType}`;
  return crypto.createHmac("sha256", secret).update(manifest).digest("hex");
}

describe("verifyDiditSignature", () => {
  const secret = "test-secret";
  const sessionId = "session-abc";
  const status = "Approved";
  const webhookType = "status.updated";
  const now = 1700000000;
  const ts = String(now);

  it("acepta una firma valida dentro de la ventana de tiempo", () => {
    const sig = sign(secret, ts, sessionId, status, webhookType);
    expect(verifyDiditSignature(secret, sig, ts, sessionId, status, webhookType, now)).toBe(true);
  });

  it("rechaza una firma con secreto incorrecto", () => {
    const sig = sign("otro-secreto", ts, sessionId, status, webhookType);
    expect(verifyDiditSignature(secret, sig, ts, sessionId, status, webhookType, now)).toBe(false);
  });

  it("rechaza si el status no calza con el firmado", () => {
    const sig = sign(secret, ts, sessionId, status, webhookType);
    expect(verifyDiditSignature(secret, sig, ts, sessionId, "Declined", webhookType, now)).toBe(false);
  });

  it("rechaza un timestamp fuera de la ventana de 300s", () => {
    const sig = sign(secret, ts, sessionId, status, webhookType);
    expect(verifyDiditSignature(secret, sig, ts, sessionId, status, webhookType, now + 301)).toBe(false);
  });

  it("rechaza campos ausentes", () => {
    const sig = sign(secret, ts, sessionId, status, webhookType);
    expect(verifyDiditSignature(secret, undefined, ts, sessionId, status, webhookType, now)).toBe(false);
    expect(verifyDiditSignature(secret, sig, undefined, sessionId, status, webhookType, now)).toBe(false);
    expect(verifyDiditSignature(secret, sig, ts, undefined, status, webhookType, now)).toBe(false);
  });

  it("rechaza un header de firma malformado (no hex)", () => {
    expect(verifyDiditSignature(secret, "no-es-hex", ts, sessionId, status, webhookType, now)).toBe(false);
  });
});
