import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { setPathname } from "@/test/next";
import { CountUp, Reveal, RevealCell, RevealGroup, RevealItem, RevealList } from "./index";
import { PageTransition } from "./page-transition";

describe("motion primitives", () => {
  it("Reveal renders children (div / section / ul)", () => {
    const { rerender } = render(<Reveal>hi</Reveal>);
    expect(screen.getByText("hi")).toBeInTheDocument();
    rerender(
      <Reveal as="section">
        <span>sec</span>
      </Reveal>,
    );
    expect(screen.getByText("sec")).toBeInTheDocument();
    rerender(
      <Reveal as="ul">
        <li>row</li>
      </Reveal>,
    );
    expect(screen.getByRole("listitem")).toHaveTextContent("row");
  });

  it("RevealList / RevealItem render a real ul/li", () => {
    render(
      <RevealList>
        <RevealItem>a</RevealItem>
        <RevealItem>b</RevealItem>
      </RevealList>,
    );
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
  });

  it("RevealGroup / RevealCell render children", () => {
    render(
      <RevealGroup>
        <RevealCell>x</RevealCell>
      </RevealGroup>,
    );
    expect(screen.getByText("x")).toBeInTheDocument();
  });

  it("CountUp eventually shows the target value", async () => {
    render(<CountUp value={42} format={(n) => `R$ ${Math.round(n)}`} />);
    expect(await screen.findByText("R$ 42", {}, { timeout: 2500 })).toBeInTheDocument();
  });

  it("PageTransition renders children keyed by pathname", () => {
    setPathname("/dashboard");
    render(
      <PageTransition>
        <p>page</p>
      </PageTransition>,
    );
    expect(screen.getByText("page")).toBeInTheDocument();
  });
});
