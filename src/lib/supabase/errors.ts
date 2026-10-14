/**
 * VES-79 — the message shown for a failed RPC. Our functions `raise exception`
 * with a ready pt-BR message (SQLSTATE P0001), such as "Estoque insuficiente:
 * saldo atual 8": it is shown whole, never cut at a ":". The English guards
 * and any other database error get an explicit pt-BR message instead.
 */
export const NOT_ALLOWED = "Você não tem permissão para esta ação";
export const SIGNED_OUT = "Sua sessão expirou. Entre novamente.";
export const UNEXPECTED = "Não foi possível concluir a ação. Tente novamente.";

const RAISED = "P0001";

export function rpcErrorMessage(error: { message: string; code?: string }): string {
  const message = error.message.trim();
  if (/not authenticated/i.test(message)) return SIGNED_OUT;
  if (/not authorized|permission denied/i.test(message) || error.code === "42501") {
    return NOT_ALLOWED;
  }
  if (error.code === RAISED && message) return message;
  return UNEXPECTED;
}
