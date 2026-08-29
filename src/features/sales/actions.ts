"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { requireActiveOrganization } from "@/features/organizations/queries";
import { cancelSaleSchema, saleSchema } from "./validation";

export type SaleActionState = { error?: string };

export async function confirmSale(
  _prev: SaleActionState,
  formData: FormData,
): Promise<SaleActionState> {
  await requireActiveOrganization();

  const parsed = saleSchema.safeParse({
    customerId: formData.get("customerId") || "",
    paymentMethod: formData.get("paymentMethod"),
    discount: formData.get("discount") || 0,
    items: JSON.parse((formData.get("items") as string) || "[]"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("confirm_sale", {
    p_customer_id: parsed.data.customerId || undefined,
    p_payment_method: parsed.data.paymentMethod,
    p_discount: parsed.data.discount,
    p_items: parsed.data.items.map((i) => ({ variant_id: i.variantId, quantity: i.quantity })),
  });

  if (error) return { error: error.message.replace(/^.*?:\s*/, "") };

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
  redirect(`/vendas/${(data as { id: string }).id}?toast=sale-confirmed`);
}

export async function cancelSale(formData: FormData): Promise<void> {
  await requireActiveOrganization();
  const parsed = cancelSaleSchema.safeParse({
    saleId: formData.get("saleId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) throw new Error(parsed.error.issues[0]?.message);

  const supabase = await createClient();
  const { error } = await supabase.rpc("cancel_sale", {
    p_sale_id: parsed.data.saleId,
    p_reason: parsed.data.reason,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/vendas");
  revalidatePath("/dashboard");
  redirect(`/vendas/${parsed.data.saleId}?toast=sale-cancelled`);
}
