"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { negotiationActionSchema, openNegotiationSchema, sendMessageSchema } from "./validation";
import { toChatEvent, type ChatEvent } from "./chat";

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
    message: formData.get("message") ?? undefined,
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
    // accept/reject/cancel/complete forms have no message field → null
    message: formData.get("message") ?? undefined,
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

export type SendMessageResult = { event: ChatEvent } | { error: string };

/**
 * Chat message (RF-NEG-010, ADR-0010). Returns the stored event instead of
 * redirecting, so the chat swaps its optimistic bubble in place; the other
 * party gets it through Supabase Realtime.
 */
export async function sendNegotiationMessage(
  negotiationId: string,
  body: string,
): Promise<SendMessageResult> {
  await requireActiveOrganization();
  const parsed = sendMessageSchema.safeParse({ negotiationId, body });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("send_negotiation_message", {
    p_negotiation_id: parsed.data.negotiationId,
    p_body: parsed.data.body,
  });
  if (error) {
    return {
      error: /not authorized|not authenticated/i.test(error.message)
        ? "Você não tem permissão para esta ação"
        : error.message,
    };
  }
  return { event: toChatEvent(data) };
}

/** Full event list — the chat refetches it on every (re)connection to fill gaps. */
export async function refreshNegotiationEvents(negotiationId: string): Promise<ChatEvent[]> {
  await requireActiveOrganization();
  const parsed = sendMessageSchema.shape.negotiationId.safeParse(negotiationId);
  if (!parsed.success) return [];
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("negotiation_events")
    .select("id, type, body, created_at, actor_id")
    .eq("negotiation_id", parsed.data)
    .order("created_at");
  if (error) throw error;
  return (data ?? []).map(toChatEvent);
}
