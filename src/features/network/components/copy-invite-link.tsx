"use client";

import { Button, Icon } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";

/**
 * VES-95 — the factory copies a pending invite's link to send it by any
 * channel (WhatsApp, its own email) when the invite email didn't arrive.
 */
export function CopyInviteLink({ token, email }: { token: string; email: string }) {
  const { toast } = useToast();

  async function copy() {
    const url = `${window.location.origin}/convite/${token}`;
    try {
      await navigator.clipboard.writeText(url);
      toast({ message: "Link do convite copiado.", variant: "success" });
    } catch {
      toast({ message: `Não foi possível copiar. Link: ${url}`, variant: "error" });
    }
  }

  return (
    <Button
      type="button"
      variant="secondary"
      size="sm"
      onClick={copy}
      aria-label={`Copiar link do convite de ${email}`}
    >
      <Icon name="content_copy" size={18} />
      Copiar link
    </Button>
  );
}
