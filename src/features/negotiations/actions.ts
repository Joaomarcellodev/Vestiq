"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { negotiationActionSchema, openNegotiationSchema } from "./validation";

export type ActionState = { error?: string };

export async function openNegotiation(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  await requireActiveOrganization();
  const parsed = openNegotiationSchema.safeParse({
    offerId: formData.get("offerId"),
    quantity: formData.get("quantity"),
    amount: formData.get("amount"),
    message: formData.get("message"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("open_negotiation", {
    p_offer_id: parsed.data.offerId,
    p_quantity: parsed.data.quantity,
    p_amount: parsed.data.amount,
    p_message: parsed.data.message || undefined,
  });
  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/negociacoes");
  redirect(`/negociacoes/${(data as { id: string }).id}?toast=negotiation-opened`);
}

export async function negotiationAction(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const parsed = negotiationActionSchema.safeParse({
    negotiationId: formData.get("negotiationId"),
    action: formData.get("action"),
    message: formData.get("message"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const supabase = await createClient();
  const { negotiationId, action, message } = parsed.data;

  const { error } =
    action === "complete"
      ? await supabase.rpc("complete_negotiation", { p_negotiation_id: negotiationId })
      : await supabase.rpc("negotiation_transition", {
          p_negotiation_id: negotiationId,
          p_action: action,
          p_message: message || undefined,
        });

  if (error) throw new Error(error.message.replace(/^.*?:\s*/, ""));

  revalidatePath(`/negociacoes/${negotiationId}`);
  revalidatePath("/negociacoes");
  revalidatePath("/dashboard");

  const toastCode: Record<string, string> = {
    accept: "negotiation-accepted",
    reject: "negotiation-rejected",
    cancel: "negotiation-cancelled",
    complete: "negotiation-completed",
  };
  if (toastCode[action]) {
    redirect(`/negociacoes/${negotiationId}?toast=${toastCode[action]}`);
  }
}
