import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ModerationReport } from "../queries";

const moderateReport = vi.fn();
const setOrganizationSuspension = vi.fn();
vi.mock("../actions", () => ({
  moderateReport: (p: unknown, fd: FormData) => moderateReport(p, fd),
  setOrganizationSuspension: (p: unknown, fd: FormData) => setOrganizationSuspension(p, fd),
}));

const { ModerationDecisionForm } = await import("./moderation-decision-form");
const { SuspensionForm } = await import("./suspension-form");

const REPORT: ModerationReport = {
  id: "r1",
  targetType: "OFFER",
  targetId: "o1",
  targetLabel: "Tênis",
  targetActive: true,
  targetOrgId: "org1",
  targetOrgName: "Loja X",
  targetOrgSuspended: false,
  targetOrgSuspensionReason: null,
  reporterOrgName: "Loja Y",
  reason: "PRODUTO_FALSIFICADO",
  description: null,
  status: "OPEN",
  resolutionNote: null,
  resolvedAt: null,
  createdAt: "2026-10-29T12:00:00Z",
  openReportsOnOrg: 1,
};

describe("moderation forms (VES-44)", () => {
  it("archives with the typed reason", async () => {
    moderateReport.mockResolvedValueOnce({});
    render(<ModerationDecisionForm report={REPORT} />);
    await userEvent.type(screen.getByLabelText("Motivo da decisão"), "Sem indícios");
    await userEvent.click(screen.getByRole("button", { name: "Arquivar denúncia" }));
    const fd = moderateReport.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      reportId: "r1",
      reason: "Sem indícios",
      action: "DISMISS_REPORT",
    });
  });

  it("asks before removing the offer", async () => {
    moderateReport.mockResolvedValueOnce({ error: "Informe o motivo da decisão" });
    render(<ModerationDecisionForm report={REPORT} />);
    await userEvent.click(screen.getByRole("button", { name: "Remover oferta" }));
    expect(screen.getByRole("heading", { name: "Remover esta oferta?" })).toBeInTheDocument();
    await userEvent.click(screen.getAllByRole("button", { name: "Remover oferta" }).at(-1)!);
    const fd = moderateReport.mock.calls.at(-1)![1] as FormData;
    expect(fd.get("action")).toBe("REMOVE_OFFER");
    expect(await screen.findByRole("alert")).toHaveTextContent("Informe o motivo da decisão");
  });

  it("offers only what still makes sense", () => {
    render(
      <ModerationDecisionForm
        report={{
          ...REPORT,
          targetType: "ORGANIZATION",
          targetActive: false,
          targetOrgSuspended: true,
        }}
      />,
    );
    expect(screen.queryByRole("button", { name: "Remover oferta" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Suspender loja" })).toBeNull();
    expect(screen.getByRole("button", { name: "Arquivar denúncia" })).toBeInTheDocument();
  });

  it("reactivates a store with a reason", async () => {
    setOrganizationSuspension.mockResolvedValueOnce({});
    render(
      <SuspensionForm
        organizationId="org1"
        organizationName="Loja X"
        suspended={false}
        back="/moderacao"
      />,
    );
    await userEvent.type(screen.getByLabelText("Motivo para reativar Loja X"), "Recurso aceito");
    await userEvent.click(screen.getByRole("button", { name: "Reativar loja" }));
    await userEvent.click(screen.getAllByRole("button", { name: "Reativar loja" }).at(-1)!);
    const fd = setOrganizationSuspension.mock.calls.at(-1)![1] as FormData;
    expect(Object.fromEntries(fd)).toEqual({
      organizationId: "org1",
      suspended: "0",
      back: "/moderacao",
      reason: "Recurso aceito",
    });
  });
});
