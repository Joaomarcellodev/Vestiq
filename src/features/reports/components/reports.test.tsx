import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { reportHref, reportTargetPath, REPORT_TARGET_PARAM } from "../validation";

const submitReport = vi.fn();
vi.mock("../actions", () => ({
  submitReport: (p: unknown, fd: FormData) => submitReport(p, fd),
}));

const { ReportForm } = await import("./report-form");
const { ReportLink } = await import("./report-link");

describe("reports (VES-43)", () => {
  it("sends the chosen reason and the description", async () => {
    submitReport.mockResolvedValueOnce({});
    render(<ReportForm targetType="OFFER" targetId="o1" />);
    await userEvent.click(screen.getByLabelText("Produto falsificado"));
    await userEvent.type(screen.getByLabelText("O que aconteceu? (opcional)"), "Logo torto");
    await userEvent.click(screen.getByRole("button", { name: "Enviar denúncia" }));

    const fd = submitReport.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      targetType: "OFFER",
      targetId: "o1",
      reason: "PRODUTO_FALSIFICADO",
      description: "Logo torto",
    });
    expect(screen.getByRole("link", { name: "Voltar" })).toHaveAttribute(
      "href",
      "/rede/ofertas/o1",
    );
  });

  it("shows the action's error", async () => {
    submitReport.mockResolvedValueOnce({
      error: "Você já denunciou isto. A moderação vai analisar.",
    });
    render(<ReportForm targetType="ORGANIZATION" targetId="r1" />);
    await userEvent.click(screen.getByLabelText("Spam ou anúncio repetido"));
    await userEvent.click(screen.getByRole("button", { name: "Enviar denúncia" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Você já denunciou isto.");
  });

  it("ReportLink opens the form for its target", () => {
    render(<ReportLink target="NEGOTIATION" id="n1" label="Denunciar conversa" />);
    expect(screen.getByRole("link", { name: "Denunciar conversa" })).toHaveAttribute(
      "href",
      "/denunciar?alvo=negociacao&id=n1",
    );
  });

  it("maps every target to its URL word and page", () => {
    for (const [param, target] of Object.entries(REPORT_TARGET_PARAM)) {
      expect(reportHref(target, "x")).toBe(`/denunciar?alvo=${param}&id=x`);
    }
    expect(reportTargetPath("OFFER", "x")).toBe("/rede/ofertas/x");
    expect(reportTargetPath("NEGOTIATION", "x")).toBe("/negociacoes/x");
    expect(reportTargetPath("ORGANIZATION", "x")).toBe("/rede/revendedoras/x");
  });
});
