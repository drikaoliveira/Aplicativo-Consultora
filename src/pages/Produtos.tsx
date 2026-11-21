import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countProducts, findProductByBarcode, saveProduct, searchProducts } from '../lib/api'
import { precoTexto } from '../lib/carrinho'
import { money, parseMoney } from '../lib/format'
import type { Product } from '../lib/types'
import Topo from '../components/Topo'
import Janela from '../components/Janela'
const LeitorCodigo = lazy(() => import('../components/LeitorCodigo'))

type Edicao = { id?: string; barcode: string; name: string; price: string }

export default function Produtos() {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<Product[]>([])
  const [total, setTotal] = useState<number | null>(null)
  const [editar, setEditar] = useState<Edicao | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    countProducts().then(setTotal).catch(() => {})
  }, [])
  useEffect(() => {
    const t = setTimeout(() => searchProducts(busca).then(setLista).catch((e) => setErro(e.message)), 250)
    return () => clearTimeout(t)
  }, [busca])

  async function lido(codigo: string) {
    setLendo(false)
    const p = await findProductByBarcode(codigo).catch(() => null)
    setEditar(p ? { id: p.id, barcode: p.barcode ?? '', name: p.name, price: precoTexto(p.price) } : { barcode: codigo, name: '', price: '' })
  }

  async function salvar() {
    if (!editar || !editar.name.trim()) return
    try {
      const p = await saveProduct({ barcode: editar.barcode.trim() || null, name: editar.name, price: parseMoney(editar.price) }, editar.id)
      setEditar(null)
      setBusca(p.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page">
      <Topo titulo="🧴 Produtos" />
      {total !== null && <p className="detalhe">{total} produtos cadastrados.</p>}
      <div className="linha" style={{ margin: '10px 0' }}>
        <button className="btn pequeno" onClick={() => setLendo(true)}>📷 Ler código</button>
        <button className="btn claro pequeno" onClick={() => setEditar({ barcode: '', name: '', price: '' })}>+ Novo</button>
      </div>
      <div className="busca">
        <input placeholder="🔎 Nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {erro && <p className="erro">{erro}</p>}
      {busca.trim().length < 2 && (
        <p className="vazio">
          Digite para procurar. <br />
          <Link to="/produtos/importar">Importar produtos de uma planilha</Link>
        </p>
      )}
      {lista.map((p) => (
        <button key={p.id} className="cartao" onClick={() => setEditar({ id: p.id, barcode: p.barcode ?? '', name: p.name, price: precoTexto(p.price) })}>
          <div className="item-lista">
            <div>
              <div className="nome">{p.name}</div>
              <div className="detalhe">{p.barcode ?? 'sem código'}</div>
            </div>
            <div className="direita">{p.price !== null ? money(p.price) : '—'}</div>
          </div>
        </button>
      ))}

      {lendo && <Suspense fallback={<div className="leitor"><div className="rodape">Abrindo câmera…</div></div>}><LeitorCodigo lido={lido} fechar={() => setLendo(false)} /></Suspense>}
      <Janela aberta={Boolean(editar)} fechar={() => setEditar(null)}>
        {editar && (
          <>
            <h2>{editar.id ? 'Editar produto' : 'Novo produto'}</h2>
            <label htmlFor="p-nome">Nome</label>
            <input id="p-nome" value={editar.name} onChange={(e) => setEditar({ ...editar, name: e.target.value })} />
            <label htmlFor="p-preco">Preço</label>
            <input id="p-preco" inputMode="decimal" value={editar.price} onChange={(e) => setEditar({ ...editar, price: e.target.value })} />
            <label htmlFor="p-codigo">Código de barras <span className="opcional">(opcional)</span></label>
            <input id="p-codigo" inputMode="numeric" value={editar.barcode} onChange={(e) => setEditar({ ...editar, barcode: e.target.value })} />
            <div className="pilha" style={{ marginTop: 14 }}>
              <button className="btn" onClick={salvar} disabled={!editar.name.trim()}>Salvar</button>
              <button className="btn contorno" onClick={() => setEditar(null)}>Cancelar</button>
            </div>
          </>
        )}
      </Janela>
    </div>
  )
}
