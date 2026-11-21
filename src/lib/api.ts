import { supabase } from './supabase'
import type { Customer, CustomerBalance, Entry, PaymentMethod, Product } from './types'

function check<T>(res: { data: T | null; error: { message: string } | null }): T {
  if (res.error) throw new Error(traduzErro(res.error.message))
  return res.data as T
}

export function traduzErro(msg: string): string {
  if (/Invalid login credentials/i.test(msg)) return 'E-mail ou senha incorretos.'
  if (/Failed to fetch|NetworkError/i.test(msg)) return 'Sem internet. Tente de novo.'
  if (/JWT expired/i.test(msg)) return 'Sua sessão expirou. Entre de novo.'
  return msg
}

/** Clientes com saldo calculado. */
export async function listBalances(): Promise<CustomerBalance[]> {
  const rows = check(await supabase.from('customer_balances').select('*').order('name'))
  return (rows as CustomerBalance[]).map((r) => ({ ...r, balance: Number(r.balance) }))
}

export async function getBalance(id: string): Promise<CustomerBalance> {
  const r = check(await supabase.from('customer_balances').select('*').eq('id', id).single()) as CustomerBalance
  return { ...r, balance: Number(r.balance) }
}

export async function getCustomer(id: string): Promise<Customer> {
  return check(await supabase.from('customers').select('*').eq('id', id).single()) as Customer
}

export type CustomerInput = Omit<Customer, 'id' | 'active'> & { active?: boolean }

export async function saveCustomer(input: CustomerInput, id?: string): Promise<Customer> {
  const clean = Object.fromEntries(
    Object.entries(input).map(([k, v]) => [k, typeof v === 'string' ? v.trim() || null : v]),
  ) as Partial<Customer>
  if (id) return check(await supabase.from('customers').update(clean).eq('id', id).select().single()) as Customer
  return check(await supabase.from('customers').insert(clean).select().single()) as Customer
}

export async function listEntries(customerId: string): Promise<Entry[]> {
  const rows = check(
    await supabase
      .from('entries')
      .select('*')
      .eq('customer_id', customerId)
      .order('occurred_on')
      .order('created_at'),
  ) as Entry[]
  return rows.map((e) => ({ ...e, amount: Number(e.amount), delta: Number(e.delta) }))
}

export interface SaleItem {
  product_id: string | null
  description: string
  quantity: number
  amount: number // valor total da linha
}

export async function addSale(customerId: string, items: SaleItem[], occurredOn: string): Promise<void> {
  const group = crypto.randomUUID()
  check(
    await supabase.from('entries').insert(
      items.map((i) => ({
        customer_id: customerId,
        kind: 'venda',
        product_id: i.product_id,
        description: i.description,
        quantity: i.quantity,
        amount: i.amount,
        sale_group: group,
        occurred_on: occurredOn,
      })),
    ),
  )
}

export async function addPayment(
  customerId: string,
  amount: number,
  method: PaymentMethod,
  occurredOn: string,
): Promise<void> {
  check(
    await supabase.from('entries').insert({
      customer_id: customerId,
      kind: 'pagamento',
      description: 'Pagamento',
      amount,
      payment_method: method,
      occurred_on: occurredOn,
    }),
  )
}

export async function addOpeningBalance(customerId: string, amount: number, occurredOn: string): Promise<void> {
  check(
    await supabase.from('entries').insert({
      customer_id: customerId,
      kind: 'saldo_anterior',
      description: 'Saldo da ficha de papel',
      amount,
      occurred_on: occurredOn,
    }),
  )
}

export async function reverseEntry(entry: Entry, reason: string): Promise<void> {
  check(
    await supabase.from('entries').insert({
      customer_id: entry.customer_id,
      kind: 'estorno',
      description: reason.trim() ? `Correção: ${reason.trim()}` : `Correção de "${entry.description}"`,
      amount: entry.amount, // o banco recalcula a partir do original
      reverses_entry_id: entry.id,
    }),
  )
}

/** Pagamentos e estornos de pagamentos no período, para "recebido no mês". */
export async function receivedBetween(fromISO: string, toISO: string): Promise<number> {
  const rows = check(
    await supabase
      .from('entries')
      .select('delta, kind, reverses_entry_id')
      .gte('occurred_on', fromISO)
      .lte('occurred_on', toISO)
      .in('kind', ['pagamento', 'estorno']),
  ) as { delta: number; kind: string }[]
  // pagamento: delta negativo (entrou dinheiro).
  // estorno com delta positivo = correção de um pagamento (dinheiro "sai" do recebido).
  // estorno com delta negativo = correção de venda (não afeta o recebido).
  return rows.reduce((s, r) => {
    const d = Number(r.delta)
    if (r.kind === 'pagamento') return s - d
    if (d > 0) return s - d
    return s
  }, 0)
}

// ------------------------------------------------------------- produtos

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  const res = await supabase.from('products').select('*').eq('barcode', barcode).maybeSingle()
  const p = check(res) as Product | null
  return p ? { ...p, price: p.price === null ? null : Number(p.price) } : null
}

export async function searchProducts(term: string): Promise<Product[]> {
  const t = term.trim()
  if (t.length < 2) return []
  const like = `%${t.replace(/[%_]/g, '')}%`
  const rows = check(
    await supabase
      .from('products')
      .select('*')
      .eq('active', true)
      .or(`name.ilike.${like},barcode.ilike.${like},code.ilike.${like}`)
      .order('name')
      .limit(15),
  ) as Product[]
  return rows.map((p) => ({ ...p, price: p.price === null ? null : Number(p.price) }))
}

export async function saveProduct(p: { barcode: string | null; name: string; price: number | null; code?: string | null }, id?: string): Promise<Product> {
  const row = { barcode: p.barcode || null, name: p.name.trim(), price: p.price, code: p.code ?? null }
  if (id) return check(await supabase.from('products').update(row).eq('id', id).select().single()) as Product
  return check(await supabase.from('products').insert(row).select().single()) as Product
}

export async function countProducts(): Promise<number> {
  const res = await supabase.from('products').select('id', { count: 'exact', head: true })
  if (res.error) throw new Error(traduzErro(res.error.message))
  return res.count ?? 0
}

/** Importa em lotes; produtos com código de barras já existente são atualizados. */
export async function importProducts(
  rows: { barcode: string | null; code: string | null; name: string; price: number | null }[],
  onProgress?: (done: number) => void,
): Promise<number> {
  const withCode = rows.filter((r) => r.barcode)
  const withoutCode = rows.filter((r) => !r.barcode)
  let done = 0
  for (let i = 0; i < withCode.length; i += 500) {
    const chunk = withCode.slice(i, i + 500)
    check(await supabase.from('products').upsert(chunk, { onConflict: 'user_id,barcode' }))
    done += chunk.length
    onProgress?.(done)
  }
  for (let i = 0; i < withoutCode.length; i += 500) {
    const chunk = withoutCode.slice(i, i + 500)
    check(await supabase.from('products').insert(chunk))
    done += chunk.length
    onProgress?.(done)
  }
  return done
}

/** Nomes já usados em vendas, para sugerir ao digitar. */
export async function recentDescriptions(): Promise<string[]> {
  const rows = check(
    await supabase.from('entries').select('description').eq('kind', 'venda').order('created_at', { ascending: false }).limit(500),
  ) as { description: string }[]
  return [...new Set(rows.map((r) => r.description))]
}

/** Exporta tudo em CSV (backup). */
export async function exportAll(): Promise<{ customers: Customer[]; entries: Entry[] }> {
  const customers = check(await supabase.from('customers').select('*').order('name')) as Customer[]
  const entries = check(await supabase.from('entries').select('*').order('occurred_on').order('created_at')) as Entry[]
  return { customers, entries }
}
