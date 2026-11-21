import { Link } from 'react-router-dom'
import { listBalances } from '../lib/api'
import { agruparPorBairro, chaveBairro } from '../lib/cobranca'
import { money } from '../lib/format'
import { useCarregar } from '../components/useCarregar'

export default function Cobrar() {
  const { dados, erro, carregando } = useCarregar(listBalances)
  const grupos = agruparPorBairro((dados ?? []).filter((c) => c.active))
  const total = grupos.reduce((s, g) => s + g.total, 0)

  return (
    <div className="page">
      <h1>📍 Cobrar este mês</h1>
      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="carregando">Carregando…</p>}
      {!carregando && grupos.length === 0 && <p className="vazio">Ninguém devendo. 🎉</p>}
      {grupos.length > 0 && (
        <p className="detalhe" style={{ marginBottom: 12 }}>
          {money(total)} para receber em {grupos.length} {grupos.length === 1 ? 'bairro' : 'bairros'}. Toque no bairro para ver as clientes.
        </p>
      )}
      {grupos.map((g) => (
        <Link key={g.bairro} className="cartao" to={`/cobrar/${encodeURIComponent(chaveBairro(g.bairro))}`}>
          <div className="item-lista">
            <div>
              <div className="nome" style={{ textTransform: 'uppercase' }}>{g.bairro}</div>
              <div className="detalhe">
                {g.clientes.length} {g.clientes.length === 1 ? 'cliente' : 'clientes'}
              </div>
            </div>
            <div className="direita">
              <div className="valor-devido">{money(g.total)}</div>
              <div className="detalhe">a receber ›</div>
            </div>
          </div>
        </Link>
      ))}
    </div>
  )
}
