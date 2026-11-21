import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBalances } from '../lib/api'
import { money } from '../lib/format'
import { useCarregar } from '../components/useCarregar'
import { filtrarClientes } from '../components/EscolherCliente'

export default function Clientes() {
  const { dados, erro, carregando } = useCarregar(listBalances)
  const [termo, setTermo] = useState('')
  const [inativas, setInativas] = useState(false)
  const lista = useMemo(
    () => filtrarClientes((dados ?? []).filter((c) => c.active !== inativas), termo),
    [dados, termo, inativas],
  )

  return (
    <div className="page">
      <div className="topo">
        <h1>👤 Clientes</h1>
        <Link className="btn pequeno" to="/clientes/nova" style={{ width: 'auto' }}>
          + Nova
        </Link>
      </div>
      <div className="busca">
        <input placeholder="🔎 Nome, telefone ou bairro" value={termo} onChange={(e) => setTermo(e.target.value)} />
      </div>
      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="carregando">Carregando…</p>}
      {!carregando && lista.length === 0 && <p className="vazio">Nenhuma cliente encontrada.</p>}
      {lista.map((c) => (
        <Link key={c.id} className="cartao" to={`/clientes/${c.id}`}>
          <div className="item-lista">
            <div>
              <div className="nome">{c.name}</div>
              <div className="detalhe">{c.neighborhood ?? 'Sem bairro'}</div>
            </div>
            <div className="direita">
              <span className={c.balance > 0 ? 'valor-devido' : 'valor-ok'}>{money(c.balance)}</span>
            </div>
          </div>
        </Link>
      ))}
      <button className="btn contorno pequeno" style={{ marginTop: 16 }} onClick={() => setInativas(!inativas)}>
        {inativas ? 'Ver clientes ativas' : 'Ver clientes inativas'}
      </button>
    </div>
  )
}
