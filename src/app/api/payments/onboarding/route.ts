import { NextResponse, type NextRequest } from "next/server";
import { publicEnv } from "@/lib/env";
import { getCurrentUser } from "@/features/auth/queries";
import { requireActiveOrganization } from "@/features/organizations/queries";
import {
  createOnboardingLink,
  createRecipientAccount,
  paymentsConfigured,
} from "@/features/payments/provider/stripe";
import { getFactoryPayoutAccount } from "@/features/payments/queries";
import { linkPayoutAccount } from "@/features/payments/sync";

/**
 * VES-27 — sends a factory admin to the Stripe-hosted onboarding of the
 * factory's connected account, creating the account the first time. Also the
 * account link's `refresh_url`: an expired link lands here and gets a new one.
 * Requires a session (not in the proxy's public paths).
 */
export async function GET(request: NextRequest) {
  const back = (toast: string) =>
    NextResponse.redirect(new URL(`/recebimentos?toast=${toast}`, request.url));

  const org = await requireActiveOrganization();
  if (org.type !== "FACTORY" || (org.role !== "FACTORY_ADMIN" && org.role !== "PLATFORM_ADMIN")) {
    return back("payouts-not-allowed");
  }
  if (!paymentsConfigured()) return back("payouts-unavailable");

  try {
    let { stripeAccountId } = await getFactoryPayoutAccount(org.id);
    if (!stripeAccountId) {
      const user = await getCurrentUser();
      const account = await createRecipientAccount({
        organizationId: org.id,
        name: org.name,
        email: user?.email,
      });
      await linkPayoutAccount(org.id, account.id, account.transfersStatus);
      stripeAccountId = account.id;
    }
    const url = await createOnboardingLink({
      accountId: stripeAccountId,
      refreshUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/api/payments/onboarding`,
      returnUrl: `${publicEnv.NEXT_PUBLIC_SITE_URL}/recebimentos?cadastro=retorno`,
    });
    return NextResponse.redirect(url);
  } catch (err) {
    console.error("[payments] onboarding failed", err);
    return back("payouts-onboarding-failed");
  }
}
