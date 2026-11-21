export interface ItemCarrinho {
  chave: string
  product_id: string | null
  nome: string
  quantidade: number
  precoUnitario: string // texto digitado, ex.: "129,90"
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
