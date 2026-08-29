"use client";

import { useTransition } from "react";
import { Switch } from "@/components/atoms";
import { useToast } from "@/components/organisms/toast/toast-provider";
import { setMemberActive } from "../actions";

export function MemberActiveSwitch({
  memberId,
  active,
  disabled = false,
  resellerName,
}: {
  memberId: string;
  active: boolean;
  disabled?: boolean;
  resellerName: string;
}) {
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();

  return (
    <Switch
      label={`${active ? "Desativar" : "Ativar"} ${resellerName}`}
      checked={active}
      disabled={disabled}
      loading={pending}
      onChange={(next) => {
        const fd = new FormData();
        fd.set("memberId", memberId);
        fd.set("active", String(next));
        startTransition(async () => {
          await setMemberActive(fd);
          toast(
            next
              ? { message: `${resellerName} reativada.`, variant: "success" }
              : { message: `${resellerName} desativada.`, variant: "info" },
          );
        });
      }}
    />
  );
}
