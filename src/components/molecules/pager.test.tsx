import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { Pager } from "./pager";

describe("Pager (VES-90)", () => {
  it("renders nothing for a single page", () => {
    const { container } = render(
      <Pager basePath="/clientes" params={{}} page={1} hasNext={false} />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("links to the next page keeping the search", () => {
    render(<Pager basePath="/clientes" params={{ q: "ana" }} page={1} hasNext />);
    expect(screen.getByText("Página 1")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /anterior/i })).toBeNull();
    expect(screen.getByRole("link", { name: /próxima/i })).toHaveAttribute(
      "href",
      "/clientes?q=ana&pagina=2",
    );
  });

  it("links back, to the first page without pagina", () => {
    render(<Pager basePath="/rede" params={{ pagina: "2" }} page={2} hasNext={false} />);
    expect(screen.getByRole("link", { name: /anterior/i })).toHaveAttribute("href", "/rede");
    expect(screen.queryByRole("link", { name: /próxima/i })).toBeNull();
  });
});
