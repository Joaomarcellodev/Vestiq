/** CPF validation — BR-CUS-03. */

export function isValidCPF(raw: string): boolean {
  const cpf = raw.replace(/\D/g, "");
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digits = cpf.split("").map(Number) as number[];

  const check = (len: number): number => {
    let sum = 0;
    for (let i = 0; i < len; i += 1) {
      sum += (digits[i] as number) * (len + 1 - i);
    }
    const mod = (sum * 10) % 11;
    return mod === 10 ? 0 : mod;
  };

  return check(9) === digits[9] && check(10) === digits[10];
}

export function formatCPF(raw: string): string {
  const cpf = raw.replace(/\D/g, "").slice(0, 11);
  return cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{1,2})/, "$1.$2.$3-$4");
}
