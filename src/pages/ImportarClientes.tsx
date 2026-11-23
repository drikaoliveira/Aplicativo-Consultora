import { useState } from 'react'
import { Link } from 'react-router-dom'
import { addOpeningBalance, listBalances, saveCustomer } from '../lib/api'
import { guessColunasCliente, toClientes, type ColunasCliente, lerCsv } from '../lib/csv'
import { money, normalize, todayISO } from '../lib/format'
import { lerTexto } from './ImportarProdutos'
import Topo from '../components/Topo'

const CAMPOS: { k: keyof ColunasCliente; rotulo: string }[] = [
  { k: 'name', rotulo: 'Nome (obrigatório)' },
  { k: 'balance', rotulo: 'Saldo / quanto deve' },
  { k: 'neighborhood', rotulo: 'Bairro' },
  { k: 'phone', rotulo: 'Telefone / WhatsApp' },
  { k: 'street', rotulo: 'Rua' },
  { k: 'number', rotulo: 'Número' },
  { k: 'city', rotulo: 'Cidade' },
  { k: 'notes', rotulo: 'Observações' },
]

export default function ImportarClientes() {
  const [linhas, setLinhas] = useState<Record<string, string>[]>([])
  const [colunas, setColunas] = useState<string[]>([])
  const [mapa, setMapa] = useState<ColunasCliente | null>(null)
  const [existentes, setExistentes] = useState<Set<string>>(new Set())
  const [progresso, setProgresso] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)

  async function abrir(file: File | undefined) {
    if (!file) return
    setErro(null)
    setMsg(null)
    if (/\.xlsx?$/i.test(file.name)) return setErro('Este arquivo é do Excel. Use "Salvar como" → "CSV" e escolha o arquivo .csv aqui.')
    const texto = await lerTexto(file)
    const { colunas: cols, linhas: dadosCsv } = lerCsv(texto)
    setColunas(cols)
    setLinhas(dadosCsv)
    setMapa(guessColunasCliente(cols))
    const atuais = await listBalances()
    setExistentes(new Set(atuais.map((c) => normalize(c.name))))
  }

  const clientes = mapa?.name ? toClientes(linhas, mapa) : []
  const novas = clientes.filter((c) => !existentes.has(normalize(c.name)))
  const repetidas = clientes.length - novas.length
  const invalidos = clientes.filter((c) => c.balanceInvalido)
  const total = novas.reduce((s, c) => s + c.balance, 0)

  async function importar() {
    setErro(null)
    setProgresso(0)
    let n = 0
    try {
      for (const c of novas) {
        const salvo = await saveCustomer({
          name: c.name, phone: c.phone, street: c.street, number: c.number, complement: null,
          neighborhood: c.neighborhood, city: c.city, reference: null, notes: c.notes,
        })
        if (c.balance > 0) await addOpeningBalance(salvo.id, c.balance, todayISO())
        n++
        setProgresso(n)
      }
      setMsg(`${n} clientes cadastradas.${repetidas ? ` ${repetidas} já existiam e foram puladas.` : ''}`)
      setLinhas([])
    } catch (e) {
      setErro(`Parou na cliente ${n + 1}: ${e instanceof Error ? e.message : String(e)}. As ${n} anteriores já foram salvas; importe de novo que elas serão puladas.`)
    } finally {
      setProgresso(null)
    }
  }

  return (
    <div className="page">
      <Topo titulo="📥 Importar clientes" />
      <p className="detalhe">
        Planilha em <b>CSV</b> com uma cliente por linha. Só o <b>nome</b> é obrigatório; o <b>saldo</b> entra na ficha como “Saldo anterior”. Clientes com
        nome igual a uma já cadastrada são puladas.
      </p>
      <input type="file" accept=".csv,text/csv,.txt,.xls,.xlsx" onChange={(e) => abrir(e.target.files?.[0])} style={{ marginTop: 10 }} />
      {erro && <p className="erro">{erro}</p>}
      {msg && (
        <p className="sucesso">
          {msg} <Link to="/clientes">Ver clientes</Link>
        </p>
      )}

      {mapa && linhas.length > 0 && (
        <>
          <h2>Quais colunas usar?</h2>
          {CAMPOS.map(({ k, rotulo }) => (
            <div key={k}>
              <label htmlFor={`col-${k}`}>{rotulo}</label>
              <select id={`col-${k}`} value={mapa[k] ?? ''} onChange={(e) => setMapa({ ...mapa, [k]: e.target.value || null })}>
                <option value="">— não usar —</option>
                {colunas.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
          ))}

          <h2>Prévia</h2>
          <p className="detalhe">
            {novas.length} clientes novas · {money(total)} a receber
            {repetidas > 0 && ` · ${repetidas} já cadastradas (serão puladas)`}
          </p>
          {invalidos.length > 0 && (
            <p className="erro">
              {invalidos.length} saldo(s) não parecem valor (ex.: {invalidos[0].name}). Essas clientes entram com saldo zero; corrija na planilha se
              preferir.
            </p>
          )}
          {novas.slice(0, 8).map((c, i) => (
            <div key={i} className="cartao item-lista">
              <div>
                <div className="nome">{c.name}</div>
                <div className="detalhe">{c.neighborhood ?? 'Sem bairro'}{c.phone ? ` · ${c.phone}` : ''}</div>
              </div>
              <div className="direita valor-devido">{money(c.balance)}</div>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 16 }} disabled={novas.length === 0 || progresso !== null} onClick={importar}>
            {progresso !== null ? `Cadastrando… ${progresso}/${novas.length}` : `Cadastrar ${novas.length} clientes`}
          </button>
        </>
      )}
    </div>
  )
}
