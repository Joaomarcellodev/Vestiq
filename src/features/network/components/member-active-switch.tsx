"use client";

import { useTransition } from "react";
import { Switch } from "@/components/atoms";
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
        startTransition(() => setMemberActive(fd));
      }}
    />
  );
}
