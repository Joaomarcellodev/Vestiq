import { describe, expect, it } from "vitest";
import { classifyStock } from "./classify";

describe("classifyStock (BR-INV-08)", () => {
  it("classifies out of stock", () => {
    expect(classifyStock(0, 3)).toBe("out");
    expect(classifyStock(-1, 3)).toBe("out");
  });
  it("classifies low stock", () => {
    expect(classifyStock(1, 3)).toBe("low");
    expect(classifyStock(3, 3)).toBe("low");
  });
  it("classifies healthy stock", () => {
    expect(classifyStock(4, 3)).toBe("ok");
  });
});
