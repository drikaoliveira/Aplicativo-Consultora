import { Link } from 'react-router-dom'
import { listBalances, receivedBetween } from '../lib/api'
import { daysBetween, money, todayISO } from '../lib/format'
import { useCarregar } from '../components/useCarregar'

export default function Inicio() {
  const hoje = todayISO()
  const inicioMes = hoje.slice(0, 8) + '01'
  const { dados, erro, carregando } = useCarregar(async () => {
    const [clientes, recebido] = await Promise.all([listBalances(), receivedBetween(inicioMes, hoje)])
    return { clientes, recebido }
  })

  const devendo = (dados?.clientes ?? []).filter((c) => c.balance > 0)
  const total = devendo.reduce((s, c) => s + c.balance, 0)
  const semPagarHaMuito = [...devendo]
    .map((c) => ({ ...c, dias: daysBetween(c.last_payment_on ?? c.first_debit_on) ?? 0 }))
    .sort((a, b) => b.dias - a.dias)
    .slice(0, 5)

  return (
    <div className="page">
      <h1>Olá! 👋</h1>
      {erro && <p className="erro">{erro}</p>}
      <div className="numeros">
        <div className="numero destaque">
          <div className="rotulo">Total a receber</div>
          <div className="valor">{carregando ? '…' : money(total)}</div>
        </div>
        <div className="numero">
          <div className="rotulo">Clientes devendo</div>
          <div className="valor">{carregando ? '…' : devendo.length}</div>
        </div>
        <div className="numero">
          <div className="rotulo">Recebido no mês</div>
          <div className="valor">{carregando ? '…' : money(dados?.recebido)}</div>
        </div>
      </div>

      <div className="grade">
        <Link className="btn" to="/venda">
          <span className="icone">🛍</span>Nova venda
        </Link>
        <Link className="btn verde" to="/recebi">
          <span className="icone">💰</span>Recebi
        </Link>
        <Link className="btn claro" to="/cobrar">
          <span className="icone">📍</span>Cobrar este mês
        </Link>
        <Link className="btn claro" to="/clientes/nova">
          <span className="icone">👤</span>Nova cliente
        </Link>
      </div>

      {semPagarHaMuito.length > 0 && (
        <>
          <h2>Há mais tempo sem pagar</h2>
          {semPagarHaMuito.map((c) => (
            <Link key={c.id} className="cartao" to={`/clientes/${c.id}`}>
              <div className="item-lista">
                <div>
                  <div className="nome">{c.name}</div>
                  <div className="detalhe">
                    {c.neighborhood ?? 'Sem bairro'} · {c.dias} dias
                  </div>
                </div>
                <div className="direita valor-devido">{money(c.balance)}</div>
              </div>
            </Link>
          ))}
        </>
      )}

      {!carregando && (dados?.clientes.length ?? 0) === 0 && (
        <div className="cartao" style={{ marginTop: 16 }}>
          <p>
            <b>Comece passando as fichas de papel para cá.</b>
          </p>
          <p className="detalhe">Só as clientes que devem: nome, bairro, telefone e o saldo da ficha.</p>
          <Link className="btn" to="/passar-fichas" style={{ marginTop: 10 }}>
            📋 Passar fichas
          </Link>
        </div>
      )}
    </div>
  )
}
