import { supabase } from './supabase'
import type { Customer, CustomerBalance, Entry, Origem, PaymentMethod, Product } from './types'

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
  origem: Origem | null
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
        product_id: i.origem === 'pessoal' ? i.product_id : null,
        catalog_product_id: i.origem === 'catalogo' ? i.product_id : null,
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
// Dois lugares: catálogo central (catalog_products, Natura, igual para todas)
// e produtos da consultora (products, outras marcas). Na busca e na leitura,
// o produto pessoal tem prioridade (ela pode ter cadastrado nome/preço próprios).

const TABELA: Record<Origem, string> = { catalogo: 'catalog_products', pessoal: 'products' }

type ProdutoBruto = Omit<Product, 'origem' | 'brand' | 'price'> & { price: number | string | null; brand?: string | null }

function produto(origem: Origem, p: ProdutoBruto): Product {
  return { ...p, origem, brand: p.brand ?? null, price: p.price === null ? null : Number(p.price) }
}

export async function isAdmin(): Promise<boolean> {
  const res = await supabase.rpc('is_admin')
  return !res.error && res.data === true
}

export async function findProductByBarcode(barcode: string): Promise<Product | null> {
  for (const origem of ['pessoal', 'catalogo'] as Origem[]) {
    const p = check(await supabase.from(TABELA[origem]).select('*').eq('barcode', barcode).eq('active', true).maybeSingle()) as ProdutoBruto | null
    if (p) return produto(origem, p)
  }
  return null
}

/** Junta resultados: pessoais primeiro; não repete código de barras que já apareceu. */
export function juntarProdutos(pessoais: Product[], catalogo: Product[], limite = 20): Product[] {
  const codigos = new Set(pessoais.map((p) => p.barcode).filter(Boolean))
  return [...pessoais, ...catalogo.filter((p) => !p.barcode || !codigos.has(p.barcode))].slice(0, limite)
}

export async function searchProducts(term: string): Promise<Product[]> {
  const t = term.trim()
  if (t.length < 2) return []
  const like = `%${t.replace(/[%_,()]/g, '')}%`
  const busca = (origem: Origem) =>
    supabase
      .from(TABELA[origem])
      .select('*')
      .eq('active', true)
      .or(`name.ilike.${like},barcode.ilike.${like},code.ilike.${like}`)
      .order('name')
      .limit(15)
  const [a, b] = await Promise.all([busca('pessoal'), busca('catalogo')])
  const pessoais = (check(a) as ProdutoBruto[]).map((p) => produto('pessoal', p))
  const catalogo = (check(b) as ProdutoBruto[]).map((p) => produto('catalogo', p))
  return juntarProdutos(pessoais, catalogo)
}

/** Salva produto. Pessoal: qualquer consultora. Catálogo: só administradora (o banco recusa as demais). */
export async function saveProduct(
  p: { barcode: string | null; name: string; price: number | null; code?: string | null },
  id?: string,
  origem: Origem = 'pessoal',
): Promise<Product> {
  const row = { barcode: p.barcode || null, name: p.name.trim(), price: p.price, code: p.code ?? null }
  const q = supabase.from(TABELA[origem])
  const r = id ? await q.update(row).eq('id', id).select().single() : await q.insert(row).select().single()
  return produto(origem, check(r) as ProdutoBruto)
}

export async function countProducts(): Promise<{ catalogo: number; pessoal: number }> {
  const conta = async (origem: Origem) => {
    const res = await supabase.from(TABELA[origem]).select('id', { count: 'exact', head: true })
    if (res.error) throw new Error(traduzErro(res.error.message))
    return res.count ?? 0
  }
  const [catalogo, pessoal] = await Promise.all([conta('catalogo'), conta('pessoal')])
  return { catalogo, pessoal }
}

/** Importa em lotes; produtos com código de barras já existente são atualizados. */
export async function importProducts(
  rows: { barcode: string | null; code: string | null; name: string; price: number | null }[],
  destino: Origem,
  onProgress?: (done: number) => void,
): Promise<number> {
  const tabela = TABELA[destino]
  const conflito = destino === 'catalogo' ? 'barcode' : 'user_id,barcode'
  const withCode = rows.filter((r) => r.barcode)
  const withoutCode = rows.filter((r) => !r.barcode)
  let done = 0
  for (let i = 0; i < withCode.length; i += 500) {
    const chunk = withCode.slice(i, i + 500)
    check(await supabase.from(tabela).upsert(chunk, { onConflict: conflito }))
    done += chunk.length
    onProgress?.(done)
  }
  for (let i = 0; i < withoutCode.length; i += 500) {
    const chunk = withoutCode.slice(i, i + 500)
    check(await supabase.from(tabela).insert(chunk))
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
