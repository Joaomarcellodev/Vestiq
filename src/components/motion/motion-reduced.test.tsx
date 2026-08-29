import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";

vi.mock("motion/react", async (importOriginal) => {
  const actual = await importOriginal<typeof import("motion/react")>();
  return { ...actual, useReducedMotion: () => true };
});

// Imported after the mock so the primitives see `useReducedMotion() === true`.
const { CountUp, Reveal, RevealList, RevealItem, RevealGroup, RevealCell } =
  await import("./index");
const { PageTransition } = await import("./page-transition");

describe("motion primitives with reduced motion", () => {
  it("Reveal renders a plain element per `as`", () => {
    const { rerender } = render(<Reveal>d</Reveal>);
    expect(screen.getByText("d")).toBeInTheDocument();
    rerender(
      <Reveal as="ul">
        <li>x</li>
      </Reveal>,
    );
    expect(screen.getByRole("listitem")).toBeInTheDocument();
    rerender(
      <Reveal as="section">
        <span>s</span>
      </Reveal>,
    );
    expect(screen.getByText("s")).toBeInTheDocument();
  });

  it("RevealList / RevealItem / RevealGroup / RevealCell stay plain", () => {
    render(
      <>
        <RevealList>
          <RevealItem>li</RevealItem>
        </RevealList>
        <RevealGroup>
          <RevealCell>cell</RevealCell>
        </RevealGroup>
      </>,
    );
    expect(screen.getByText("li")).toBeInTheDocument();
    expect(screen.getByText("cell")).toBeInTheDocument();
  });

  it("CountUp renders the final value immediately", () => {
    render(<CountUp value={7} format={(n) => `${n}`} />);
    expect(screen.getByText("7")).toBeInTheDocument();
  });

  it("PageTransition renders children unwrapped", () => {
    render(
      <PageTransition>
        <p>page</p>
      </PageTransition>,
    );
    expect(screen.getByText("page")).toBeInTheDocument();
  });
});
