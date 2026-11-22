import { describe, expect, it } from 'vitest'
import { daysBetween, money, parseMoney, dateBR } from '../src/lib/format'
import { mapsRouteLink, whatsappNumber, chargeMessage } from '../src/lib/links'
import { codigosEstragados, guessColumns, guessColunasCliente, toClientes, toProducts } from '../src/lib/csv'
import { agruparPorBairro } from '../src/lib/cobranca'
import { adicionar, carrinhoValido, descontoCarrinho, totalCarrinho } from '../src/lib/carrinho'
import { linhasDaFicha } from '../src/pages/Ficha'
import { validarNovaSenha } from '../src/pages/TrocarSenha'
import { juntarProdutos, traduzErro } from '../src/lib/api'
import type { Product } from '../src/lib/types'
import type { CustomerBalance, Entry } from '../src/lib/types'

describe('valores e datas', () => {
  it('formata reais e datas no padrão brasileiro', () => {
    expect(money(129.9)).toBe('R$ 129,90')
    expect(money(1420)).toBe('R$ 1.420,00')
    expect(dateBR('2026-11-21')).toBe('21/11/2026')
  })
  it('entende o valor como a pessoa digita', () => {
    expect(parseMoney('129,90')).toBe(129.9)
    expect(parseMoney('R$ 1.299,90')).toBe(1299.9)
    expect(parseMoney('129.90')).toBe(129.9)
    expect(parseMoney('100')).toBe(100)
    expect(parseMoney('1.299')).toBe(1299)
    expect(parseMoney('abc')).toBeNull()
    expect(parseMoney('')).toBeNull()
  })
  it('conta dias', () => {
    expect(daysBetween('2026-11-01', '2026-11-21')).toBe(20)
    expect(daysBetween(null)).toBeNull()
  })
})

describe('ficha', () => {
  const base = { quantity: null, payment_method: null, product_id: null, catalog_product_id: null, sale_group: null, reverses_entry_id: null, created_at: '', customer_id: 'c' }
  it('reproduz a ficha de exemplo: saldo acumulado linha a linha, com estorno', () => {
    const e: Entry[] = [
      { ...base, id: '1', kind: 'venda', description: 'Kaiak', quantity: 2, amount: 185.9, delta: 185.9, occurred_on: '2026-11-01' },
      { ...base, id: '2', kind: 'venda', description: 'Desodorante', amount: 59.9, delta: 59.9, occurred_on: '2026-11-01' },
      { ...base, id: '3', kind: 'pagamento', description: 'Pagamento', amount: 100, delta: -100, occurred_on: '2026-11-05' },
      { ...base, id: '4', kind: 'estorno', description: 'Correção', amount: 59.9, delta: -59.9, reverses_entry_id: '2', occurred_on: '2026-11-06' },
    ]
    const l = linhasDaFicha(e)
    expect(l.map((x) => x.saldo)).toEqual([185.9, 245.8, 145.8, 85.9])
    expect(l[1].estornado).toBe(true)
    expect(l[0].estornado).toBe(false)
  })
})

describe('cobrança por bairro', () => {
  const c = (id: string, bairro: string | null, balance: number, last: string | null): CustomerBalance => ({
    id, name: id, phone: null, street: null, number: null, complement: null, neighborhood: bairro, city: null, reference: null,
    active: true, balance, last_payment_on: last, last_entry_on: null, first_debit_on: '2026-09-01',
  })
  it('agrupa só quem deve, junta grafias do mesmo bairro e ordena', () => {
    const g = agruparPorBairro(
      [c('Ana', 'Floresta', 100, '2026-11-10'), c('Bia', 'floresta ', 50, '2026-10-01'), c('Cida', 'Santa Tereza', 300, null), c('Duda', 'Floresta', 0, null)],
      '2026-11-21',
    )
    expect(g.map((x) => [x.bairro, x.clientes.length, x.total])).toEqual([
      ['Santa Tereza', 1, 300],
      ['Floresta', 2, 150],
    ])
    expect(g[1].clientes.map((x) => x.name)).toEqual(['Bia', 'Ana']) // mais tempo sem pagar primeiro
  })
})

describe('links', () => {
  it('monta número do WhatsApp com 55', () => {
    expect(whatsappNumber('(31) 99999-8888')).toBe('5531999998888')
    expect(whatsappNumber('5531999998888')).toBe('5531999998888')
    expect(whatsappNumber('123')).toBeNull()
  })
  it('usa o primeiro nome na mensagem', () => {
    expect(chargeMessage('Maria da Silva', 'R$ 10,00')).toMatch(/^Olá, Maria\./)
  })
  it('monta rota com paradas e destino', () => {
    const url = mapsRouteLink([
      { street: 'Rua A', number: '1', neighborhood: 'Floresta' },
      { street: null, neighborhood: null },
      { street: 'Rua B', number: '2', neighborhood: 'Floresta' },
    ])!
    expect(url).toContain('destination=Rua%20B%2C%202%20-%20Floresta')
    expect(url).toContain('waypoints=Rua%20A%2C%201%20-%20Floresta')
    expect(mapsRouteLink([{ street: null }])).toBeNull()
  })
})

describe('importação do PDV', () => {
  it('reconhece colunas comuns e converte linhas', () => {
    const cols = guessColumns(['Código', 'Cód. Barras', 'Descrição do Produto', 'Preço Venda', 'Estoque'])
    expect(cols).toEqual({ barcode: 'Cód. Barras', name: 'Descrição do Produto', price: 'Preço Venda', code: 'Código' })
    const p = toProducts(
      [
        { 'Cód. Barras': '7891033123456', 'Descrição do Produto': 'Kaiak Feminino 100ml', 'Preço Venda': '159,90', Código: '12345' },
        { 'Cód. Barras': '', 'Descrição do Produto': 'Sacola', 'Preço Venda': '', Código: '' },
        { 'Cód. Barras': '7891033123456', 'Descrição do Produto': 'Kaiak Feminino 100 ml', 'Preço Venda': '149,90', Código: '12345' },
        { 'Cód. Barras': '1', 'Descrição do Produto': '', 'Preço Venda': '1', Código: '' },
      ],
      cols,
    )
    expect(p).toEqual([
      { barcode: '7891033123456', code: '12345', name: 'Kaiak Feminino 100 ml', price: 149.9 },
      { barcode: null, code: null, name: 'Sacola', price: null },
    ])
  })
})

describe('códigos cortados pelo Excel', () => {
  it('detecta notação científica e não usa o código quebrado', () => {
    const rows = [
      { EAN: '7,89103E+12', Nome: 'Kaiak' },
      { EAN: '7891033123456', Nome: 'Ekos' },
    ]
    expect(codigosEstragados(rows, 'EAN')).toBe(1)
    const p = toProducts(rows, { barcode: 'EAN', name: 'Nome', price: null, code: null })
    expect(p.map((x) => x.barcode)).toEqual([null, '7891033123456'])
  })
})

describe('carrinho', () => {
  it('soma quantidade quando o mesmo produto é lido de novo', () => {
    let it1 = adicionar([], { product_id: 'p1', origem: 'catalogo', nome: 'Kaiak', precoUnitario: '129,90', precoTabela: 159.9 })
    it1 = adicionar(it1, { product_id: 'p1', origem: 'catalogo', nome: 'Kaiak', precoUnitario: '129,90', precoTabela: 159.9 })
    it1 = adicionar(it1, { product_id: null, origem: null, nome: 'Presente', precoUnitario: '', precoTabela: null })
    expect(it1[0].quantidade).toBe(2)
    expect(carrinhoValido(it1)).toBe('Falta o valor de "Presente".')
    it1[1].precoUnitario = '20'
    expect(carrinhoValido(it1)).toBeNull()
    expect(totalCarrinho(it1)).toBe(279.8)
    // promoção: tabela 159,90, vendido 129,90, 2 unidades
    expect(descontoCarrinho(it1)).toBe(60)
  })
})

describe('catálogo central + meus produtos', () => {
  const p = (id: string, origem: 'catalogo' | 'pessoal', barcode: string | null): Product => ({
    id, origem, brand: origem === 'catalogo' ? 'Natura' : null, barcode, code: null, name: id, price: 10, active: true,
  })
  it('mostra os pessoais primeiro e não repete o mesmo código do catálogo', () => {
    const r = juntarProdutos([p('meu-kaiak', 'pessoal', '789'), p('tupperware', 'pessoal', null)], [p('kaiak', 'catalogo', '789'), p('ekos', 'catalogo', '790')])
    expect(r.map((x) => x.id)).toEqual(['meu-kaiak', 'tupperware', 'ekos'])
  })
  it('mesmo id em origens diferentes não se soma no carrinho', () => {
    let c = adicionar([], { product_id: 'x', origem: 'catalogo', nome: 'A', precoUnitario: '1', precoTabela: 1 })
    c = adicionar(c, { product_id: 'x', origem: 'pessoal', nome: 'B', precoUnitario: '1', precoTabela: 1 })
    expect(c.length).toBe(2)
  })
})

describe('trocar senha', () => {
  it('valida a senha nova antes de enviar', () => {
    expect(validarNovaSenha('', 'abcdef', 'abcdef')).toMatch(/senha que você usa/)
    expect(validarNovaSenha('123456', 'abc', 'abc')).toMatch(/6 caracteres/)
    expect(validarNovaSenha('123456', 'abcdef', 'abcdeg')).toMatch(/não estão iguais/)
    expect(validarNovaSenha('123456', '123456', '123456')).toMatch(/igual à atual/)
    expect(validarNovaSenha('123456', 'flor2026', 'flor2026')).toBeNull()
  })
})

describe('importar clientes', () => {
  it('reconhece colunas e converte saldos', () => {
    const cols = guessColunasCliente(['Nome', 'Saldo', 'Bairro', 'Telefone', 'Observação da leitura'])
    expect(cols).toMatchObject({ name: 'Nome', balance: 'Saldo', neighborhood: 'Bairro', phone: 'Telefone', notes: 'Observação da leitura' })
    const c = toClientes(
      [
        { Nome: 'Cliente A', Saldo: '119,80', Bairro: 'Floresta', Telefone: '', 'Observação da leitura': '' },
        { Nome: 'Cliente B', Saldo: '', Bairro: '', Telefone: '', 'Observação da leitura': '' },
        { Nome: 'Cliente C', Saldo: '1?9,80', Bairro: '', Telefone: '', 'Observação da leitura': 'conferir' },
        { Nome: '', Saldo: '10', Bairro: '', Telefone: '', 'Observação da leitura': '' },
      ],
      cols,
    )
    expect(c.map((x) => [x.name, x.balance, x.balanceInvalido, x.neighborhood])).toEqual([
      ['Cliente A', 119.8, false, 'Floresta'],
      ['Cliente B', 0, false, null],
      ['Cliente C', 0, true, null],
    ])
  })
})

describe('mensagens de erro', () => {
  it('traduz o limite de e-mails do Supabase', () => {
    expect(traduzErro('email rate limit exceeded')).toMatch(/Espere cerca de 1 hora/)
    expect(traduzErro('Invalid login credentials')).toBe('E-mail ou senha incorretos.')
  })
})
