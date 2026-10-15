import type { ToastVariant } from "@/components/organisms/toast/toast-provider";

/**
 * Server Actions that `redirect()` on success can't hold client toast state, so
 * they append `?toast=<code>` to the destination. `<FlashToaster>` reads the
 * code, shows the matching toast and strips the param.
 */
export const FLASH_MESSAGES: Record<string, { message: string; variant: ToastVariant }> = {
  // auth
  "password-updated": { message: "Senha redefinida com sucesso.", variant: "success" },

  // catalog
  "product-created": { message: "Produto cadastrado.", variant: "success" },
  "product-updated": { message: "Produto atualizado.", variant: "success" },
  "product-archived": { message: "Produto arquivado.", variant: "success" },
  "product-archived-offered": {
    message: "Produto arquivado e peças publicadas na rede.",
    variant: "success",
  },
  "product-unarchived": { message: "Produto desarquivado.", variant: "success" },
  "product-archive-failed": {
    message: "Não foi possível arquivar o produto. Tente novamente.",
    variant: "error",
  },
  "product-unarchive-failed": {
    message: "Não foi possível desarquivar o produto. Tente novamente.",
    variant: "error",
  },

  // customers
  "customer-created": { message: "Cliente cadastrado.", variant: "success" },
  "customer-updated": { message: "Cliente atualizado.", variant: "success" },
  "customer-archived": { message: "Cliente arquivado.", variant: "success" },
  "customer-unarchived": { message: "Cliente reativado.", variant: "success" },
  "customer-archive-failed": {
    message: "Não foi possível arquivar o cliente. Tente novamente.",
    variant: "error",
  },
  "customer-unarchive-failed": {
    message: "Não foi possível reativar o cliente. Tente novamente.",
    variant: "error",
  },

  // sales
  "sale-confirmed": { message: "Venda registrada.", variant: "success" },
  "sale-cancelled": { message: "Venda cancelada e estoque estornado.", variant: "success" },

  // offers
  "offer-published": { message: "Oferta publicada na rede.", variant: "success" },
  "offer-cancelled": { message: "Oferta cancelada.", variant: "success" },
  "offer-photos-updated": { message: "Fotos da oferta atualizadas.", variant: "success" },

  // negotiations
  "negotiation-opened": { message: "Proposta enviada.", variant: "success" },
  "negotiation-accepted": { message: "Proposta aceita.", variant: "success" },
  "negotiation-rejected": { message: "Proposta recusada.", variant: "info" },
  "negotiation-cancelled": { message: "Negociação cancelada.", variant: "info" },
  "negotiation-completed": { message: "Transferência concluída.", variant: "success" },

  // supply orders
  "supply-order-placed": { message: "Pedido enviado ao fornecedor.", variant: "success" },
  "supply-order-confirmed": { message: "Pedido confirmado.", variant: "success" },
  "supply-order-rejected": { message: "Pedido recusado.", variant: "info" },
  "supply-order-cancelled": { message: "Pedido cancelado.", variant: "info" },

  // network
  "network-joined": { message: "Bem-vindo à rede!", variant: "success" },
  "member-activated": { message: "Revendedora reativada.", variant: "success" },
  "member-deactivated": { message: "Revendedora desativada.", variant: "info" },
  "invite-sent": { message: "Convite enviado.", variant: "success" },
};

export type FlashCode = keyof typeof FLASH_MESSAGES;
