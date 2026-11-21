export interface ItemCarrinho {
  chave: string
  product_id: string | null
  nome: string
  quantidade: number
  precoUnitario: string // texto digitado, ex.: "129,90" (preço vendido, editável)
  precoTabela: number | null // preço do catálogo, só para referência
}

import { parseMoney } from './format'

export function totalItem(i: ItemCarrinho): number {
  const p = parseMoney(i.precoUnitario) ?? 0
  return Math.round(p * i.quantidade * 100) / 100
}

export function totalCarrinho(itens: ItemCarrinho[]): number {
  return Math.round(itens.reduce((s, i) => s + totalItem(i), 0) * 100) / 100
}

/** Soma 1 se o produto já está no carrinho; senão adiciona. */
/** Desconto da linha em relação ao preço de tabela (0 se não houver tabela ou se vendeu acima). */
export function descontoItem(i: ItemCarrinho): number {
  if (i.precoTabela === null) return 0
  const vendido = parseMoney(i.precoUnitario)
  if (vendido === null) return 0
  return Math.max(0, Math.round((i.precoTabela - vendido) * i.quantidade * 100) / 100)
}

export function descontoCarrinho(itens: ItemCarrinho[]): number {
  return Math.round(itens.reduce((s, i) => s + descontoItem(i), 0) * 100) / 100
}

export function adicionar(itens: ItemCarrinho[], novo: Omit<ItemCarrinho, 'chave' | 'quantidade'>): ItemCarrinho[] {
  if (novo.product_id) {
    const i = itens.findIndex((x) => x.product_id === novo.product_id)
    if (i >= 0) return itens.map((x, j) => (j === i ? { ...x, quantidade: x.quantidade + 1 } : x))
  }
  return [...itens, { ...novo, quantidade: 1, chave: crypto.randomUUID() }]
}

export function precoTexto(n: number | null | undefined): string {
  return n === null || n === undefined ? '' : n.toFixed(2).replace('.', ',')
}

export function carrinhoValido(itens: ItemCarrinho[]): string | null {
  if (itens.length === 0) return 'Adicione pelo menos um produto.'
  const semPreco = itens.find((i) => !(parseMoney(i.precoUnitario)! > 0))
  if (semPreco) return `Falta o valor de "${semPreco.nome}".`
  return null
}
