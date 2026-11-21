const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** 129.9 -> "R$ 129,90" */
export function money(value: number | string | null | undefined): string {
  return brl.format(Number(value ?? 0)).replace(/ /g, ' ')
}

/** "2026-11-21" -> "21/11/2026" */
export function dateBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const [y, m, d] = iso.slice(0, 10).split('-')
  return `${d}/${m}/${y}`
}

/** Data de hoje no fuso local, formato ISO (AAAA-MM-DD). */
export function todayISO(now = new Date()): string {
  const off = now.getTimezoneOffset() * 60000
  return new Date(now.getTime() - off).toISOString().slice(0, 10)
}

export function daysBetween(fromISO: string | null | undefined, toISO = todayISO()): number | null {
  if (!fromISO) return null
  const a = Date.parse(fromISO.slice(0, 10) + 'T00:00:00Z')
  const b = Date.parse(toISO.slice(0, 10) + 'T00:00:00Z')
  return Math.round((b - a) / 86400000)
}

/**
 * Converte texto digitado em valor: "129,90", "R$ 1.299,90", "129.90", "100" -> número.
 * Retorna null se não for um valor válido.
 */
export function parseMoney(input: string | number | null | undefined): number | null {
  if (input === null || input === undefined) return null
  if (typeof input === 'number') return Number.isFinite(input) ? Math.round(input * 100) / 100 : null
  let s = input.replace(/R\$|\s/g, '').trim()
  if (!s) return null
  const lastComma = s.lastIndexOf(',')
  const lastDot = s.lastIndexOf('.')
  if (lastComma > lastDot) {
    s = s.replace(/\./g, '').replace(',', '.') // 1.299,90
  } else if (lastDot > lastComma && lastComma !== -1) {
    s = s.replace(/,/g, '') // 1,299.90
  } else if (lastComma === -1 && lastDot !== -1 && /^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, '') // 1.299
  }
  const n = Number(s)
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null
}

export function onlyDigits(s: string | null | undefined): string {
  return (s ?? '').replace(/\D/g, '')
}

/** Remove acentos e baixa a caixa, para busca. */
export function normalize(s: string | null | undefined): string {
  return (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim()
}
