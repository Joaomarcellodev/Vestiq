import type { Metadata } from "next";
import { getMyProfile } from "@/features/profile/queries";
import { getActiveOrganization } from "@/features/organizations/queries";
import { signOut } from "@/features/auth/actions";
import { ProfileForm } from "@/features/profile/components/profile-form";
import { PageHeader } from "@/components/molecules/page-header";
import { BackButton } from "@/components/molecules/back-button";
import { Button, Icon } from "@/components/atoms";
import { MEMBER_ROLE } from "@/lib/i18n/labels";

export const metadata: Metadata = { title: "Meu perfil" };

export default async function ProfilePage() {
  const [profile, org] = await Promise.all([getMyProfile(), getActiveOrganization()]);

  return (
    <div className="space-y-lg">
      <BackButton fallback="/dashboard" label="Voltar" />
      <PageHeader
        title="Meu perfil"
        description={org ? `${org.name} · ${MEMBER_ROLE[org.role]}` : "Conta ainda sem organização"}
      />

      <ProfileForm profile={profile} />

      <section className="rounded-xl border border-outline-variant bg-surface-container-lowest p-lg shadow-surface">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-title-lg text-title-lg text-on-surface">Sessão</p>
            <p className="mt-1 font-body-md text-body-md text-on-surface-variant">
              Encerra sua sessão neste dispositivo.
            </p>
          </div>
          <form action={signOut}>
            <Button type="submit" variant="secondary" className="w-full sm:w-auto">
              <Icon name="logout" size={18} />
              Sair da conta
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
}
