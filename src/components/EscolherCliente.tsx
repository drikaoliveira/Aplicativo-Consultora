import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { listBalances } from '../lib/api'
import { money, normalize, onlyDigits } from '../lib/format'
import type { CustomerBalance } from '../lib/types'
import { useCarregar } from './useCarregar'

export function filtrarClientes(lista: CustomerBalance[], termo: string): CustomerBalance[] {
  const t = normalize(termo)
  const d = onlyDigits(termo)
  if (!t) return lista
  return lista.filter(
    (c) =>
      normalize(c.name).includes(t) ||
      normalize(c.neighborhood).includes(t) ||
      (d.length >= 3 && onlyDigits(c.phone).includes(d)),
  )
}

export default function EscolherCliente({ escolher }: { escolher: (c: CustomerBalance) => void }) {
  const { dados, erro, carregando } = useCarregar(listBalances)
  const [termo, setTermo] = useState('')
  const lista = useMemo(() => filtrarClientes((dados ?? []).filter((c) => c.active), termo), [dados, termo])

  return (
    <div>
      <div className="busca">
        <input autoFocus placeholder="🔎 Nome, telefone ou bairro" value={termo} onChange={(e) => setTermo(e.target.value)} />
      </div>
      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="carregando">Carregando…</p>}
      {!carregando && lista.length === 0 && (
        <div className="vazio">
          Nenhuma cliente encontrada.
          <div style={{ marginTop: 12 }}>
            <Link className="btn claro" to="/clientes/nova">
              👤 Cadastrar cliente
            </Link>
          </div>
        </div>
      )}
      {lista.slice(0, 60).map((c) => (
        <button key={c.id} className="cartao" onClick={() => escolher(c)}>
          <div className="item-lista">
            <div>
              <div className="nome">{c.name}</div>
              <div className="detalhe">{c.neighborhood ?? 'Sem bairro'}</div>
            </div>
            <div className="direita">
              <span className={c.balance > 0 ? 'valor-devido' : 'valor-ok'}>{money(c.balance)}</span>
            </div>
          </div>
        </button>
      ))}
    </div>
  )
}
