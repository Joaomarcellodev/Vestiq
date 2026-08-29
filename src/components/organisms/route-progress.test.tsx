import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { RouteProgress } from "./route-progress";

function setup(href: string, extra: React.AnchorHTMLAttributes<HTMLAnchorElement> = {}) {
  render(
    <>
      <RouteProgress />
      <a href={href} {...extra}>
        link
      </a>
    </>,
  );
}

const bar = () => document.querySelector('[aria-hidden="true"].fixed.inset-x-0.top-0');

describe("RouteProgress", () => {
  it("starts the bar on a same-origin link click", async () => {
    setup("/produtos");
    expect(bar()).toBeNull();
    await userEvent.click(screen.getByText("link"));
    expect(bar()).not.toBeNull();
  });

  it("ignores hash links, downloads, new-tab and external links", async () => {
    const { rerender } = render(<RouteProgress />);
    for (const [href, extra] of [
      ["#section", {}],
      ["/x", { download: "" }],
      ["/x", { target: "_blank" }],
      ["https://example.com/x", {}],
    ] as const) {
      rerender(
        <>
          <RouteProgress />
          <a href={href} {...extra} data-testid="l">
            x
          </a>
        </>,
      );
      await userEvent.click(screen.getByTestId("l"));
      expect(bar()).toBeNull();
    }
  });

  it("ignores modified (ctrl/meta) clicks", () => {
    setup("/produtos");
    screen
      .getByText("link")
      .dispatchEvent(
        new MouseEvent("click", { bubbles: true, cancelable: true, button: 0, ctrlKey: true }),
      );
    expect(bar()).toBeNull();
  });
});
