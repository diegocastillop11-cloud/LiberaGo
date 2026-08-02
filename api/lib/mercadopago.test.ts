import { describe, expect, it } from "vitest";
import crypto from "crypto";
import { verifyMpSignature } from "./mercadopago.js";

function sign(secret: string, dataId: string, requestId: string, ts: string) {
  const manifest = `id:${dataId};request-id:${requestId};ts:${ts};`;
  const v1 = crypto.createHmac("sha256", secret).update(manifest).digest("hex");
  return `ts=${ts},v1=${v1}`;
}

describe("verifyMpSignature", () => {
  const secret = "test-secret";
  const dataId = "123456";
  const requestId = "req-abc";
  const ts = "1700000000";

  it("acepta una firma valida", () => {
    const header = sign(secret, dataId, requestId, ts);
    expect(verifyMpSignature(secret, header, requestId, dataId)).toBe(true);
  });

  it("rechaza una firma con secreto incorrecto", () => {
    const header = sign("otro-secreto", dataId, requestId, ts);
    expect(verifyMpSignature(secret, header, requestId, dataId)).toBe(false);
  });

  it("rechaza si el data.id no calza con el firmado", () => {
    const header = sign(secret, dataId, requestId, ts);
    expect(verifyMpSignature(secret, header, requestId, "999999")).toBe(false);
  });

  it("rechaza headers ausentes", () => {
    expect(verifyMpSignature(secret, undefined, requestId, dataId)).toBe(false);
    expect(verifyMpSignature(secret, sign(secret, dataId, requestId, ts), undefined, dataId)).toBe(false);
    expect(verifyMpSignature(secret, sign(secret, dataId, requestId, ts), requestId, undefined)).toBe(false);
  });

  it("rechaza un header malformado", () => {
    expect(verifyMpSignature(secret, "ts=abc", requestId, dataId)).toBe(false);
  });
});
