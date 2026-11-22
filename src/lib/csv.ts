import { normalize, onlyDigits, parseMoney } from './format'

export interface ColumnGuess {
  barcode: string | null
  name: string | null
  price: string | null
  code: string | null
}

const PATTERNS: Record<keyof ColumnGuess, RegExp[]> = {
  barcode: [/ean/, /gtin/, /barra/, /cod.*bar/],
  name: [/descri/, /^nome/, /produto/],
  price: [/preco.*venda/, /preco/, /valor/, /pv/],
  code: [/^cod(igo)?$/, /cod.*(prod|natura|interno|ref)/, /^ref/, /sku/],
}

/** Tenta adivinhar quais colunas do arquivo do PDV são código de barras, nome e preço. */
export function guessColumns(headers: string[]): ColumnGuess {
  const used = new Set<string>()
  const pick = (key: keyof ColumnGuess): string | null => {
    for (const re of PATTERNS[key]) {
      const h = headers.find((x) => !used.has(x) && re.test(normalize(x)))
      if (h) {
        used.add(h)
        return h
      }
    }
    return null
  }
  // ordem importa: código de barras antes do "código" genérico
  const barcode = pick('barcode')
  const name = pick('name')
  const price = pick('price')
  const code = pick('code')
  return { barcode, name, price, code }
}

export interface ProductRow {
  barcode: string | null
  code: string | null
  name: string
  price: number | null
}

/** Converte as linhas do CSV em produtos, descartando linhas sem nome. Último registro do mesmo código vence. */
export function toProducts(rows: Record<string, string>[], cols: ColumnGuess): ProductRow[] {
  const byKey = new Map<string, ProductRow>()
  let anon = 0
  for (const r of rows) {
    const name = (cols.name ? r[cols.name] : '')?.trim()
    if (!name) continue
    const bruto = cols.barcode ? (r[cols.barcode] ?? '').trim() : ''
    // código em notação científica (Excel) está incompleto: não usar
    const barcode = bruto && !/e\+?\d+/i.test(bruto) ? onlyDigits(bruto) || null : null
    const code = cols.code ? (r[cols.code] ?? '').trim() || null : null
    const price = cols.price ? parseMoney(r[cols.price]) : null
    const key = barcode ?? `__sem_codigo_${anon++}`
    byKey.set(key, { barcode, code, name, price })
  }
  return [...byKey.values()]
}

/**
 * O Excel às vezes salva códigos de barras como "7,89103E+12", perdendo dígitos.
 * Conta quantas linhas têm esse problema na coluna escolhida.
 */
export function codigosEstragados(rows: Record<string, string>[], col: string | null): number {
  if (!col) return 0
  return rows.filter((r) => /\d[.,]?\d*e\+?\d+/i.test((r[col] ?? '').trim())).length
}

// ------------------------------------------------------------ clientes

export interface ColunasCliente {
  name: string | null
  balance: string | null
  neighborhood: string | null
  phone: string | null
  street: string | null
  number: string | null
  city: string | null
  notes: string | null
}

const PADROES_CLIENTE: Record<keyof ColunasCliente, RegExp[]> = {
  name: [/^nome/, /cliente/],
  balance: [/saldo/, /deve/, /valor/, /divida/, /debito/],
  neighborhood: [/bairro/, /regiao/],
  phone: [/telefone/, /celular/, /whats/, /^fone/, /^tel/],
  street: [/^rua/, /endereco/, /logradouro/],
  number: [/^numero/, /^n[ºo°]?$/, /^num/],
  city: [/cidade/, /municipio/],
  notes: [/obs/, /leitura/, /nota/],
}

export function guessColunasCliente(headers: string[]): ColunasCliente {
  const usados = new Set<string>()
  const out = {} as ColunasCliente
  for (const k of Object.keys(PADROES_CLIENTE) as (keyof ColunasCliente)[]) {
    out[k] = null
    for (const re of PADROES_CLIENTE[k]) {
      const h = headers.find((x) => !usados.has(x) && re.test(normalize(x)))
      if (h) {
        usados.add(h)
        out[k] = h
        break
      }
    }
  }
  return out
}

export interface ClienteImportado {
  name: string
  balance: number
  balanceInvalido: boolean
  neighborhood: string | null
  phone: string | null
  street: string | null
  number: string | null
  city: string | null
  notes: string | null
}

export function toClientes(rows: Record<string, string>[], cols: ColunasCliente): ClienteImportado[] {
  const v = (r: Record<string, string>, c: string | null) => (c ? (r[c] ?? '').trim() || null : null)
  const out: ClienteImportado[] = []
  for (const r of rows) {
    const name = v(r, cols.name)
    if (!name) continue
    const bruto = v(r, cols.balance)
    const saldo = bruto ? parseMoney(bruto) : 0
    out.push({
      name,
      balance: saldo !== null && saldo > 0 ? saldo : 0,
      balanceInvalido: bruto !== null && (saldo === null || saldo < 0),
      neighborhood: v(r, cols.neighborhood),
      phone: v(r, cols.phone),
      street: v(r, cols.street),
      number: v(r, cols.number),
      city: v(r, cols.city),
      notes: v(r, cols.notes),
    })
  }
  return out
}
