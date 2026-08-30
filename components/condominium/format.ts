/** The database keeps only the digits; the screen is where they get punctuation. */
export function formatCnpj(cnpj: string | null): string {
  if (!cnpj) return '—'
  if (cnpj.length !== 14) return cnpj

  return cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5')
}
