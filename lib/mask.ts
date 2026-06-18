// Máscara e validação de WhatsApp/telefone brasileiro.
// Formato exibido: (xx) xxxxx-xxxx (celular) ou (xx) xxxx-xxxx (fixo).

// Mantém só os dígitos (descarta máscara, espaços, etc.).
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}

// Aplica a máscara progressivamente enquanto o usuário digita.
export function maskWhatsapp(value: string): string {
  const d = onlyDigits(value).slice(0, 11); // no máx. 11 dígitos (DDD + 9)
  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 6) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  if (d.length <= 10)
    return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

// WhatsApp válido = 10 (fixo com DDD) ou 11 (celular com DDD) dígitos.
export function isValidWhatsapp(value: string): boolean {
  const len = onlyDigits(value).length;
  return len === 10 || len === 11;
}

// E-mail válido (regra simples pedida: precisa conter "@" com texto antes/depois).
export function isValidEmail(value: string): boolean {
  const v = value.trim();
  const at = v.indexOf("@");
  return at > 0 && at < v.length - 1;
}
