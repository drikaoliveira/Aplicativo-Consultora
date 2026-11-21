import { lazy, Suspense, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { countProducts, findProductByBarcode, isAdmin, saveProduct, searchProducts } from '../lib/api'
import { precoTexto } from '../lib/carrinho'
import { money, parseMoney } from '../lib/format'
import type { Origem, Product } from '../lib/types'
import Topo from '../components/Topo'
import Janela from '../components/Janela'
const LeitorCodigo = lazy(() => import('../components/LeitorCodigo'))

type Edicao = { id?: string; origem: Origem; brand: string | null; barcode: string; name: string; price: string }

const deProduto = (p: Product): Edicao => ({ id: p.id, origem: p.origem, brand: p.brand, barcode: p.barcode ?? '', name: p.name, price: precoTexto(p.price) })

export default function Produtos() {
  const [busca, setBusca] = useState('')
  const [lista, setLista] = useState<Product[]>([])
  const [total, setTotal] = useState<{ catalogo: number; pessoal: number } | null>(null)
  const [admin, setAdmin] = useState(false)
  const [editar, setEditar] = useState<Edicao | null>(null)
  const [lendo, setLendo] = useState(false)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    countProducts().then(setTotal).catch(() => {})
    isAdmin().then(setAdmin)
  }, [])
  useEffect(() => {
    const t = setTimeout(() => searchProducts(busca).then(setLista).catch((e) => setErro(e.message)), 250)
    return () => clearTimeout(t)
  }, [busca])

  async function lido(codigo: string) {
    setLendo(false)
    const p = await findProductByBarcode(codigo).catch(() => null)
    setEditar(p ? deProduto(p) : { origem: 'pessoal', brand: null, barcode: codigo, name: '', price: '' })
  }

  const podeEditar = editar ? editar.origem === 'pessoal' || admin : false

  async function salvar() {
    if (!editar || !editar.name.trim() || !podeEditar) return
    try {
      const p = await saveProduct({ barcode: editar.barcode.trim() || null, name: editar.name, price: parseMoney(editar.price) }, editar.id, editar.origem)
      setEditar(null)
      setBusca(p.name)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page">
      <Topo titulo="🧴 Produtos" />
      {total && (
        <p className="detalhe">
          Catálogo Natura: {total.catalogo} · Meus produtos: {total.pessoal}
        </p>
      )}
      <div className="linha" style={{ margin: '10px 0' }}>
        <button className="btn pequeno" onClick={() => setLendo(true)}>📷 Ler código</button>
        <button className="btn claro pequeno" onClick={() => setEditar({ origem: 'pessoal', brand: null, barcode: '', name: '', price: '' })}>
          + Meu produto
        </button>
      </div>
      <div className="busca">
        <input placeholder="🔎 Nome ou código" value={busca} onChange={(e) => setBusca(e.target.value)} />
      </div>
      {erro && <p className="erro">{erro}</p>}
      {busca.trim().length < 2 && (
        <p className="vazio">
          Digite para procurar. <br />
          Produtos de outras marcas (Tupperware, etc.) entram em “Meus produtos”.
          <br />
          <Link to="/produtos/importar">Importar produtos de uma planilha</Link>
        </p>
      )}
      {lista.map((p) => (
        <button key={p.origem + p.id} className="cartao" onClick={() => setEditar(deProduto(p))}>
          <div className="item-lista">
            <div>
              <div className="nome">{p.name}</div>
              <div className="detalhe">
                <span className={'etiqueta ' + (p.origem === 'catalogo' ? 'verde' : 'amarela')}>
                  {p.origem === 'catalogo' ? p.brand ?? 'Catálogo' : 'Meu produto'}
                </span>{' '}
                {p.barcode ?? 'sem código'}
              </div>
            </div>
            <div className="direita">{p.price !== null ? money(p.price) : '—'}</div>
          </div>
        </button>
      ))}

      {lendo && (
        <Suspense fallback={<div className="leitor"><div className="rodape">Abrindo câmera…</div></div>}>
          <LeitorCodigo lido={lido} fechar={() => setLendo(false)} />
        </Suspense>
      )}
      <Janela aberta={Boolean(editar)} fechar={() => setEditar(null)}>
        {editar && (
          <>
            <h2>
              {!editar.id ? 'Novo produto' : podeEditar ? 'Editar produto' : 'Produto do catálogo'}
              {editar.origem === 'catalogo' && <span className="etiqueta verde" style={{ marginLeft: 8 }}>{editar.brand ?? 'Catálogo'}</span>}
            </h2>
            {!podeEditar && (
              <p className="detalhe">
                Este produto é do catálogo Natura, igual para todas as consultoras. Na venda, você pode mudar o preço à vontade (promoção).
              </p>
            )}
            {!editar.id && <p className="detalhe">Vai para “Meus produtos” — só você vê.</p>}
            <label htmlFor="p-nome">Nome</label>
            <input id="p-nome" disabled={!podeEditar} value={editar.name} onChange={(e) => setEditar({ ...editar, name: e.target.value })} />
            <label htmlFor="p-preco">Preço</label>
            <input id="p-preco" disabled={!podeEditar} inputMode="decimal" value={editar.price} onChange={(e) => setEditar({ ...editar, price: e.target.value })} />
            <label htmlFor="p-codigo">Código de barras <span className="opcional">(opcional)</span></label>
            <input id="p-codigo" disabled={!podeEditar} inputMode="numeric" value={editar.barcode} onChange={(e) => setEditar({ ...editar, barcode: e.target.value })} />
            <div className="pilha" style={{ marginTop: 14 }}>
              {podeEditar && <button className="btn" onClick={salvar} disabled={!editar.name.trim()}>Salvar</button>}
              <button className="btn contorno" onClick={() => setEditar(null)}>{podeEditar ? 'Cancelar' : 'Fechar'}</button>
            </div>
          </>
        )}
      </Janela>
    </div>
  )
}
