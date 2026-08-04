import { describe, expect, it } from "vitest";
import { isValidRut, formatRut, cleanRut } from "./rut";

describe("isValidRut", () => {
  it("acepta un RUT con dígito verificador correcto", () => {
    expect(isValidRut("11111111-1")).toBe(true);
    expect(isValidRut("11.111.111-1")).toBe(true);
  });

  it("rechaza un RUT con dígito verificador incorrecto", () => {
    expect(isValidRut("11111111-2")).toBe(false);
  });

  it("acepta dígito verificador K", () => {
    expect(isValidRut("6-K")).toBe(true);
  });

  it("rechaza entradas demasiado cortas o sin dígitos", () => {
    expect(isValidRut("1")).toBe(false);
    expect(isValidRut("abc-d")).toBe(false);
  });
});

describe("cleanRut / formatRut", () => {
  it("limpia puntos y guión", () => {
    expect(cleanRut("11.111.111-1")).toBe("111111111");
  });

  it("formatea con puntos y guión", () => {
    expect(formatRut("111111111")).toBe("11.111.111-1");
  });
});
