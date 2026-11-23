import { useEffect, useState } from 'react'
import { importProducts, isAdmin } from '../lib/api'
import type { Origem } from '../lib/types'
import { codigosEstragados, guessColumns, toProducts, type ColumnGuess, lerCsv } from '../lib/csv'
import { money } from '../lib/format'
import Topo from '../components/Topo'

/** Arquivos de PDV costumam vir em Windows-1252; tenta UTF-8 primeiro. */
export async function lerTexto(file: File): Promise<string> {
  const buf = await file.arrayBuffer()
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buf)
  } catch {
    return new TextDecoder('windows-1252').decode(buf)
  }
}

const CAMPOS: { k: keyof ColumnGuess; rotulo: string }[] = [
  { k: 'barcode', rotulo: 'Código de barras (EAN)' },
  { k: 'name', rotulo: 'Nome / descrição' },
  { k: 'price', rotulo: 'Preço' },
  { k: 'code', rotulo: 'Código do produto (opcional)' },
]

export default function ImportarProdutos() {
  const [linhas, setLinhas] = useState<Record<string, string>[]>([])
  const [colunas, setColunas] = useState<string[]>([])
  const [mapa, setMapa] = useState<ColumnGuess>({ barcode: null, name: null, price: null, code: null })
  const [progresso, setProgresso] = useState<number | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [erro, setErro] = useState<string | null>(null)
  const [admin, setAdmin] = useState(false)
  const [destino, setDestino] = useState<Origem>('pessoal')

  useEffect(() => {
    isAdmin().then((a) => {
      setAdmin(a)
      if (a) setDestino('catalogo')
    })
  }, [])

  async function abrir(file: File | undefined) {
    if (!file) return
    setErro(null)
    setMsg(null)
    if (/\.xlsx?$/i.test(file.name)) {
      setErro('Este arquivo é do Excel. No Excel, use "Salvar como" → "CSV" e escolha o arquivo .csv aqui.')
      return
    }
    const texto = await lerTexto(file)
    const { colunas: cols, linhas: dadosCsv } = lerCsv(texto)
    setColunas(cols)
    setLinhas(dadosCsv)
    setMapa(guessColumns(cols))
  }

  const produtos = mapa.name ? toProducts(linhas, mapa) : []
  const comCodigo = produtos.filter((p) => p.barcode).length
  const estragados = codigosEstragados(linhas, mapa.barcode)

  async function importar() {
    setErro(null)
    setProgresso(0)
    try {
      const n = await importProducts(produtos, destino, setProgresso)
      setMsg(`${n} produtos importados. Os que já existiam (mesmo código de barras) foram atualizados.`)
      setLinhas([])
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setProgresso(null)
    }
  }

  return (
    <div className="page">
      <Topo titulo="📥 Importar produtos" />
      <p className="detalhe">
        Escolha a planilha exportada do sistema da loja, salva em <b>CSV</b>. O app tenta reconhecer as colunas sozinho; confira abaixo.
      </p>
      {admin && (
        <>
          <label>Para onde vão os produtos?</label>
          <div className="pilha">
            <button className={'btn pequeno ' + (destino === 'catalogo' ? '' : 'contorno')} onClick={() => setDestino('catalogo')}>
              🌿 Catálogo Natura (todas as consultoras)
            </button>
            <button className={'btn pequeno ' + (destino === 'pessoal' ? '' : 'contorno')} onClick={() => setDestino('pessoal')}>
              👤 Meus produtos (só eu vejo)
            </button>
          </div>
        </>
      )}
      {!admin && <p className="detalhe">Os produtos vão para “Meus produtos” (outras marcas). O catálogo Natura já vem pronto.</p>}
      <input type="file" accept=".csv,text/csv,.txt,.xls,.xlsx" onChange={(e) => abrir(e.target.files?.[0])} style={{ marginTop: 10 }} />
      {erro && <p className="erro">{erro}</p>}
      {msg && <p className="sucesso">{msg}</p>}

      {colunas.length > 0 && linhas.length > 0 && (
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
            {produtos.length} produtos ({comCodigo} com código de barras) de {linhas.length} linhas.
          </p>
          {estragados > 0 && (
            <p className="erro">
              {estragados} código(s) de barras vieram cortados pelo Excel (ex.: 7,89103E+12). Esses produtos entram sem código. Para corrigir: no
              Excel, selecione a coluna do código → Formatar células → Texto, salve de novo como CSV e importe outra vez.
            </p>
          )}
          {produtos.slice(0, 5).map((p, i) => (
            <div key={i} className="cartao item-lista">
              <div>
                <div className="nome">{p.name}</div>
                <div className="detalhe">{p.barcode ?? 'sem código'}</div>
              </div>
              <div className="direita">{p.price !== null ? money(p.price) : '—'}</div>
            </div>
          ))}
          <button className="btn" style={{ marginTop: 16 }} disabled={!mapa.name || produtos.length === 0 || progresso !== null} onClick={importar}>
            {progresso !== null ? `Importando… ${progresso}/${produtos.length}` : `Importar ${produtos.length} produtos para ${destino === 'catalogo' ? 'o catálogo Natura' : 'Meus produtos'}`}
          </button>
        </>
      )}
    </div>
  )
}
