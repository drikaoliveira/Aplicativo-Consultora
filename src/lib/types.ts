export type EntryKind = 'venda' | 'pagamento' | 'saldo_anterior' | 'estorno'
export type PaymentMethod = 'dinheiro' | 'pix' | 'cartao' | 'transferencia' | 'outro'

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  dinheiro: 'Dinheiro',
  pix: 'Pix',
  cartao: 'Cartão',
  transferencia: 'Transferência',
  outro: 'Outro',
}

export interface Customer {
  id: string
  name: string
  phone: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  reference: string | null
  notes: string | null
  active: boolean
}

export interface CustomerBalance {
  id: string
  name: string
  phone: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  reference: string | null
  active: boolean
  balance: number
  last_payment_on: string | null
  last_entry_on: string | null
  first_debit_on: string | null
}

export interface Entry {
  id: string
  customer_id: string
  kind: EntryKind
  quantity: number | null
  description: string
  amount: number
  delta: number
  payment_method: PaymentMethod | null
  product_id: string | null
  catalog_product_id: string | null
  sale_group: string | null
  reverses_entry_id: string | null
  occurred_on: string
  created_at: string
}

/** 'catalogo' = catálogo central (Natura), igual para todas; 'pessoal' = produtos da própria consultora. */
export type Origem = 'catalogo' | 'pessoal'

export interface Product {
  id: string
  origem: Origem
  brand: string | null
  barcode: string | null
  code: string | null
  name: string
  price: number | null
  active: boolean
}
