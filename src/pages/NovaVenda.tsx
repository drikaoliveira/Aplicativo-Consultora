import { lazy, Suspense, useCallback, useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addSale, findProductByBarcode, getBalance, recentDescriptions, saveProduct, searchProducts } from '../lib/api'
import { adicionar, carrinhoValido, precoTexto, totalCarrinho, totalItem, type ItemCarrinho } from '../lib/carrinho'
import { money, normalize, parseMoney, todayISO } from '../lib/format'
import type { CustomerBalance, Product } from '../lib/types'
import Topo from '../components/Topo'
import Janela from '../components/Janela'
import EscolherCliente from '../components/EscolherCliente'
const LeitorCodigo = lazy(() => import('../components/LeitorCodigo'))

export default function NovaVenda() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const clienteId = params.get('cliente')
  const [cliente, setCliente] = useState<CustomerBalance | null>(null)
  const [itens, setItens] = useState<ItemCarrinho[]>([])
  const [lendo, setLendo] = useState(false)
  const [busca, setBusca] = useState('')
  const [achados, setAchados] = useState<Product[]>([])
  const [nomesUsados, setNomesUsados] = useState<string[]>([])
  const [novoCodigo, setNovoCodigo] = useState<string | null>(null)
  const [novoNome, setNovoNome] = useState('')
  const [novoPreco, setNovoPreco] = useState('')
  const [data, setData] = useState(todayISO())
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (clienteId) getBalance(clienteId).then(setCliente).catch((e) => setErro(e.message))
    else setCliente(null)
  }, [clienteId])

  useEffect(() => {
    recentDescriptions().then(setNomesUsados).catch(() => {})
  }, [])

  useEffect(() => {
    const t = setTimeout(() => {
      searchProducts(busca).then(setAchados).catch(() => setAchados([]))
    }, 250)
    return () => clearTimeout(t)
  }, [busca])

  const lido = useCallback(async (codigo: string) => {
    setLendo(false)
    setErro(null)
    try {
      const p = await findProductByBarcode(codigo)
      if (p) {
        setItens((it) => adicionar(it, { product_id: p.id, nome: p.name, precoUnitario: precoTexto(p.price) }))
        setAviso(`✓ ${p.name}`)
        setTimeout(() => setAviso(null), 2500)
      } else {
        setNovoCodigo(codigo)
        setNovoNome('')
        setNovoPreco('')
      }
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }, [])

  async function salvarProdutoNovo() {
    if (!novoCodigo || !novoNome.trim()) return
    try {
      const p = await saveProduct({ barcode: novoCodigo, name: novoNome, price: parseMoney(novoPreco) })
      setItens((it) => adicionar(it, { product_id: p.id, nome: p.name, precoUnitario: novoPreco }))
      setNovoCodigo(null)
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    }
  }

  function escolherProduto(p: Product) {
    setItens((it) => adicionar(it, { product_id: p.id, nome: p.name, precoUnitario: precoTexto(p.price) }))
    setBusca('')
  }

  function adicionarDigitado(nome: string) {
    if (!nome.trim()) return
    setItens((it) => adicionar(it, { product_id: null, nome: nome.trim(), precoUnitario: '' }))
    setBusca('')
  }

  function mudar(chave: string, campo: Partial<ItemCarrinho>) {
    setItens((it) => it.map((i) => (i.chave === chave ? { ...i, ...campo } : i)))
  }

  async function salvar() {
    const problema = carrinhoValido(itens)
    if (problema) return setErro(problema)
    if (!cliente) return
    setSalvando(true)
    setErro(null)
    try {
      await addSale(
        cliente.id,
        itens.map((i) => ({ product_id: i.product_id, description: i.nome, quantity: i.quantidade, amount: totalItem(i) })),
        data,
      )
      navigate(`/clientes/${cliente.id}`, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setSalvando(false)
    }
  }

  if (!cliente) {
    return (
      <div className="page">
        <Topo titulo="🛍 Nova venda — para quem?" voltar={false} />
        {erro && <p className="erro">{erro}</p>}
        <EscolherCliente escolher={(c) => setParams({ cliente: c.id }, { replace: true })} />
      </div>
    )
  }

  const t = normalize(busca)
  const sugestoesNomes = t.length >= 2 ? nomesUsados.filter((n) => normalize(n).includes(t) && !achados.some((p) => p.name === n)).slice(0, 5) : []
  const total = totalCarrinho(itens)

  return (
    <div className="page">
      <Topo titulo="🛍 Nova venda" />
      <div className="cartao item-lista">
        <div>
          <div className="detalhe">Cliente</div>
          <div className="nome">{cliente.name}</div>
        </div>
        <button className="btn contorno pequeno" style={{ width: 'auto', marginLeft: 'auto' }} onClick={() => setParams({}, { replace: true })}>
          Trocar
        </button>
      </div>

      <button className="btn" style={{ marginTop: 14, minHeight: 72 }} onClick={() => setLendo(true)}>
        📷 Ler código de barras
      </button>

      <label htmlFor="busca">Ou digite o produto</label>
      <input id="busca" placeholder="Ex.: Kaiak, desodorante…" value={busca} onChange={(e) => setBusca(e.target.value)} />
      {(achados.length > 0 || sugestoesNomes.length > 0 || busca.trim().length >= 2) && (
        <div style={{ marginTop: 6 }}>
          {achados.map((p) => (
            <button key={p.id} className="cartao" onClick={() => escolherProduto(p)}>
              <div className="item-lista">
                <div className="nome">{p.name}</div>
                <div className="direita">{p.price !== null ? money(p.price) : ''}</div>
              </div>
            </button>
          ))}
          {sugestoesNomes.map((n) => (
            <button key={n} className="cartao" onClick={() => adicionarDigitado(n)}>
              {n} <span className="detalhe">(já vendido)</span>
            </button>
          ))}
          {busca.trim().length >= 2 && (
            <button className="cartao" onClick={() => adicionarDigitado(busca)}>
              ➕ Lançar “{busca.trim()}”
            </button>
          )}
        </div>
      )}

      {aviso && <p className="sucesso">{aviso}</p>}

      <h2>Produtos da venda</h2>
      {itens.length === 0 && <p className="vazio">Nenhum produto ainda.</p>}
      {itens.map((i) => (
        <div key={i.chave} className="cartao">
          <div className="carrinho-item">
            <div className="info nome">{i.nome}</div>
            <button className="remover" aria-label="Remover" onClick={() => setItens((it) => it.filter((x) => x.chave !== i.chave))}>
              ✕
            </button>
          </div>
          <div className="linha" style={{ marginTop: 8 }}>
            <div className="qtd" style={{ flex: '0 0 auto' }}>
              <button onClick={() => mudar(i.chave, { quantidade: Math.max(1, i.quantidade - 1) })}>−</button>
              <b style={{ minWidth: 24, textAlign: 'center' }}>{i.quantidade}</b>
              <button onClick={() => mudar(i.chave, { quantidade: i.quantidade + 1 })}>+</button>
            </div>
            <input
              inputMode="decimal"
              placeholder="Valor R$"
              aria-label={`Valor de ${i.nome}`}
              value={i.precoUnitario}
              onChange={(e) => mudar(i.chave, { precoUnitario: e.target.value })}
            />
          </div>
          {i.quantidade > 1 && <p className="detalhe" style={{ textAlign: 'right' }}>{i.quantidade} × = {money(totalItem(i))}</p>}
        </div>
      ))}

      {itens.length > 0 && (
        <>
          <div className="total">
            <span>Total</span>
            <span>{money(total)}</span>
          </div>
          <label htmlFor="data">Data da venda</label>
          <input id="data" type="date" value={data} max={todayISO()} onChange={(e) => setData(e.target.value)} />
          {erro && <p className="erro">{erro}</p>}
          <button className="btn" style={{ marginTop: 16 }} onClick={salvar} disabled={salvando}>
            {salvando ? 'Salvando…' : `Anotar na ficha · ${money(total)}`}
          </button>
        </>
      )}
      {itens.length === 0 && erro && <p className="erro">{erro}</p>}

      {lendo && <Suspense fallback={<div className="leitor"><div className="rodape">Abrindo câmera…</div></div>}><LeitorCodigo lido={lido} fechar={() => setLendo(false)} /></Suspense>}

      <Janela aberta={Boolean(novoCodigo)} fechar={() => setNovoCodigo(null)}>
        <h2>Produto novo</h2>
        <p className="detalhe">
          Código {novoCodigo} ainda não está cadastrado. Preencha uma vez; da próxima vez o app já reconhece.
        </p>
        <label htmlFor="novo-nome">Nome do produto</label>
        <input id="novo-nome" autoFocus value={novoNome} onChange={(e) => setNovoNome(e.target.value)} />
        <label htmlFor="novo-preco">Preço</label>
        <input id="novo-preco" inputMode="decimal" placeholder="Ex.: 129,90" value={novoPreco} onChange={(e) => setNovoPreco(e.target.value)} />
        <div className="pilha" style={{ marginTop: 14 }}>
          <button className="btn" onClick={salvarProdutoNovo} disabled={!novoNome.trim()}>
            Salvar e adicionar
          </button>
          <button className="btn contorno" onClick={() => setNovoCodigo(null)}>
            Cancelar
          </button>
        </div>
      </Janela>
    </div>
  )
}
