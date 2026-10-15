import Link from "next/link";
import { Button } from "@/components/atoms";
import { ErrorScreen } from "@/components/molecules/error-screen";

/** `notFound()` inside the signed-in area — keeps the app shell around it. */
export default function AppNotFound() {
  return (
    <ErrorScreen
      icon="search"
      tone="neutral"
      title="Não encontramos o que você procura"
      description="O registro pode ter sido removido ou não pertence à sua organização."
      actions={
        <Link href="/dashboard">
          <Button>Voltar ao início</Button>
        </Link>
      }
    />
  );
}
