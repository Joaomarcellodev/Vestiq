import { describe, expect, it, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { setPathname, setSearchParams, routerSpy } from "@/test/next";
import { ToastProvider, useToast, type ToastVariant } from "./toast-provider";
import { FlashToaster } from "./flash-toaster";

function Trigger({ n = 1, duration = 80 }: { n?: number; duration?: number }) {
  const { toast } = useToast();
  return (
    <button
      onClick={() =>
        Array.from({ length: n }).forEach((_, i) =>
          toast({ message: `Msg ${i}`, variant: "success" as ToastVariant, duration }),
        )
      }
    >
      go
    </button>
  );
}

describe("ToastProvider / useToast", () => {
  it("throws when used outside the provider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<Trigger />)).toThrow(/ToastProvider/);
    spy.mockRestore();
  });

  it("shows a toast and auto-dismisses it after the duration", async () => {
    render(
      <ToastProvider>
        <Trigger />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    expect(screen.getByRole("status")).toHaveTextContent("Msg 0");
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull(), { timeout: 2000 });
  });

  it("keeps at most three toasts stacked", async () => {
    render(
      <ToastProvider>
        <Trigger n={5} duration={0} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    expect(screen.getAllByRole("status")).toHaveLength(3);
  });

  it("can be dismissed with the close button", async () => {
    render(
      <ToastProvider>
        <Trigger duration={0} />
      </ToastProvider>,
    );
    await userEvent.click(screen.getByText("go"));
    await userEvent.click(screen.getByRole("button", { name: "Fechar" }));
    await waitFor(() => expect(screen.queryByRole("status")).toBeNull(), { timeout: 2000 });
  });
});

describe("FlashToaster", () => {
  it("turns a ?toast=<code> param into a toast and strips it from the URL", async () => {
    setPathname("/produtos/abc");
    setSearchParams("toast=product-created&foo=1");
    render(
      <ToastProvider>
        <FlashToaster />
      </ToastProvider>,
    );
    expect(await screen.findByRole("status")).toHaveTextContent("Produto cadastrado.");
    expect(routerSpy.replace).toHaveBeenCalledWith("/produtos/abc?foo=1", { scroll: false });
  });

  it("does nothing without the param", () => {
    setPathname("/produtos");
    setSearchParams("");
    render(
      <ToastProvider>
        <FlashToaster />
      </ToastProvider>,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(routerSpy.replace).not.toHaveBeenCalled();
  });
});
