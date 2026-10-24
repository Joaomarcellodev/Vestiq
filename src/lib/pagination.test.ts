import { describe, expect, it } from "vitest";
import { PAGE_SIZE, pageHref, pageOf, pageRange, parsePage } from "./pagination";

describe("pagination (VES-90)", () => {
  it("parses ?pagina=, falling back to 1", () => {
    expect(parsePage("3")).toBe(3);
    for (const raw of [undefined, "", "0", "-2", "1.5", "abc"]) expect(parsePage(raw)).toBe(1);
  });

  it("asks for one row past the page", () => {
    expect(pageRange(1)).toEqual([0, PAGE_SIZE]);
    expect(pageRange(3, 10)).toEqual([20, 30]);
  });

  it("cuts the extra row and reports a next page", () => {
    expect(pageOf([1, 2, 3], 2, 2)).toEqual({ items: [1, 2], page: 2, hasNext: true });
    expect(pageOf([1, 2], 1, 2)).toEqual({ items: [1, 2], page: 1, hasNext: false });
    expect(pageOf([], 1, 2)).toEqual({ items: [], page: 1, hasNext: false });
  });

  it("keeps search and tabs in the page links and drops pagina on page 1", () => {
    const params = { q: "bolsa", scope: "archived", categoria: undefined, pagina: "2" };
    expect(pageHref("/produtos", params, 3)).toBe("/produtos?q=bolsa&scope=archived&pagina=3");
    expect(pageHref("/produtos", params, 1)).toBe("/produtos?q=bolsa&scope=archived");
    expect(pageHref("/rede", {}, 1)).toBe("/rede");
  });
});
