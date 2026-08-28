import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("joins truthy class names", () => {
    expect(cn("a", false && "b", "c")).toBe("a c");
  });

  it("resolves conflicting tailwind utilities (last wins)", () => {
    expect(cn("px-2", "px-4")).toBe("px-4");
  });

  it("keeps a custom text color alongside a custom font size", () => {
    // regression: twMerge used to drop `text-on-primary` here
    expect(cn("text-on-primary", "text-body-lg")).toBe("text-on-primary text-body-lg");
    expect(cn("bg-primary-container", "text-on-primary")).toBe(
      "bg-primary-container text-on-primary",
    );
  });
});
