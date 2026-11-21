import { daysBetween, normalize } from './format'
import type { CustomerBalance } from './types'

export const SEM_BAIRRO = 'Sem bairro'

export interface GrupoBairro {
  bairro: string
  clientes: (CustomerBalance & { dias: number })[]
  total: number
}

/** Bairro "de exibição": junta variações de maiúsculas/acentos ("floresta" e "Floresta"). */
export function chaveBairro(b: string | null | undefined): string {
  return normalize(b) || normalize(SEM_BAIRRO)
}

/** Agrupa clientes com saldo por bairro; dentro do bairro, quem está há mais tempo sem pagar vem primeiro. */
export function agruparPorBairro(lista: CustomerBalance[], hoje?: string): GrupoBairro[] {
  const grupos = new Map<string, GrupoBairro>()
  for (const c of lista) {
    if (!(c.balance > 0)) continue
    const k = chaveBairro(c.neighborhood)
    const nome = c.neighborhood?.trim() || SEM_BAIRRO
    const g = grupos.get(k) ?? { bairro: nome, clientes: [], total: 0 }
    const dias = daysBetween(c.last_payment_on ?? c.first_debit_on, hoje) ?? 0
    g.clientes.push({ ...c, dias })
    g.total += c.balance
    grupos.set(k, g)
  }
  for (const g of grupos.values()) {
    g.clientes.sort((a, b) => b.dias - a.dias)
    g.total = Math.round(g.total * 100) / 100
  }
  return [...grupos.values()].sort((a, b) => b.total - a.total)
}

export function etiquetaDias(dias: number): { texto: string; cor: 'vermelha' | 'amarela' | 'verde' } {
  if (dias >= 60) return { texto: `${dias} dias sem pagar`, cor: 'vermelha' }
  if (dias >= 30) return { texto: `${dias} dias sem pagar`, cor: 'amarela' }
  return { texto: dias === 0 ? 'pagou hoje' : `${dias} dias`, cor: 'verde' }
}
