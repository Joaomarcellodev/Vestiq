"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { cancelInvite, resendInvite } from "../actions";

/**
 * VES-88 — resend or cancel an invite nobody accepted yet. Cancelling kills
 * the link for good, so it asks for a second click first.
 */
export function PendingInviteActions({ memberId, email }: { memberId: string; email: string }) {
  const [pending, startTransition] = useTransition();
  const [running, setRunning] = useState<"resend" | "cancel" | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { toast } = useToast();

  function run(kind: "resend" | "cancel") {
    const fd = new FormData();
    fd.set("memberId", memberId);
    setRunning(kind);
    startTransition(async () => {
      const { error } = await (kind === "resend" ? resendInvite(fd) : cancelInvite(fd));
      setConfirming(false);
      if (error) {
        toast({ message: error, variant: "error" });
        return;
      }
      toast({
        message: kind === "resend" ? `Convite reenviado para ${email}.` : "Convite cancelado.",
        variant: "success",
      });
    });
  }

  if (confirming) {
    return (
      <div
        className="flex items-center gap-2"
        role="group"
        aria-label={`Cancelar convite de ${email}`}
      >
        <span className="font-body-md text-body-md text-on-surface-variant">Cancelar convite?</span>
        <Button
          type="button"
          variant="danger"
          size="sm"
          loading={pending && running === "cancel"}
          disabled={pending}
          onClick={() => run("cancel")}
        >
          Sim, cancelar
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={pending}
          onClick={() => setConfirming(false)}
        >
          Não
        </Button>
      </div>
    );
  }

  return (
    <>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        loading={pending && running === "resend"}
        disabled={pending}
        onClick={() => run("resend")}
        aria-label={`Reenviar convite para ${email}`}
      >
        Reenviar
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() => setConfirming(true)}
        aria-label={`Cancelar convite de ${email}`}
      >
        Cancelar
      </Button>
    </>
  );
}
