import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addPayment, getBalance } from '../lib/api'
import { money, parseMoney, todayISO } from '../lib/format'
import { PAYMENT_LABEL, type CustomerBalance, type PaymentMethod } from '../lib/types'
import Topo from '../components/Topo'
import EscolherCliente from '../components/EscolherCliente'

const FORMAS = Object.keys(PAYMENT_LABEL) as PaymentMethod[]

export default function Recebi() {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const clienteId = params.get('cliente')
  const [cliente, setCliente] = useState<CustomerBalance | null>(null)
  const [valor, setValor] = useState('')
  const [forma, setForma] = useState<PaymentMethod>('dinheiro')
  const [data, setData] = useState(todayISO())
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)

  useEffect(() => {
    if (clienteId) getBalance(clienteId).then(setCliente).catch((e) => setErro(e.message))
    else setCliente(null)
  }, [clienteId])

  if (!cliente) {
    return (
      <div className="page">
        <Topo titulo="💰 Recebi de quem?" />
        {erro && <p className="erro">{erro}</p>}
        <EscolherCliente escolher={(c) => setParams({ cliente: c.id }, { replace: true })} />
      </div>
    )
  }

  const v = parseMoney(valor)
  const novoSaldo = v ? Math.round((cliente.balance - v) * 100) / 100 : null

  async function salvar() {
    if (!cliente) return
    if (!v || v <= 0) return setErro('Digite o valor recebido.')
    setSalvando(true)
    setErro(null)
    try {
      await addPayment(cliente.id, v, forma, data)
      navigate(`/clientes/${cliente.id}`, { replace: true })
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
      setSalvando(false)
    }
  }

  return (
    <div className="page">
      <Topo titulo="💰 Recebi" />
      <div className="cartao item-lista">
        <div>
          <div className="nome">{cliente.name}</div>
          <div className="detalhe">Deve hoje</div>
        </div>
        <div className="direita valor-devido" style={{ fontSize: '1.3rem' }}>{money(cliente.balance)}</div>
      </div>

      <label htmlFor="valor">Quanto recebeu?</label>
      <input id="valor" className="valor-grande" inputMode="decimal" placeholder="0,00" autoFocus value={valor} onChange={(e) => setValor(e.target.value)} />
      {cliente.balance > 0 && (
        <button className="btn claro pequeno" style={{ marginTop: 8 }} onClick={() => setValor(cliente.balance.toFixed(2).replace('.', ','))}>
          Recebi tudo ({money(cliente.balance)})
        </button>
      )}

      <label>Como pagou?</label>
      <div className="grade" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
        {FORMAS.map((f) => (
          <button key={f} className={'btn pequeno ' + (forma === f ? '' : 'contorno')} style={{ minHeight: 52 }} onClick={() => setForma(f)}>
            {PAYMENT_LABEL[f]}
          </button>
        ))}
      </div>

      <label htmlFor="data">Data</label>
      <input id="data" type="date" value={data} max={todayISO()} onChange={(e) => setData(e.target.value)} />

      {novoSaldo !== null && (
        <p className={novoSaldo > 0 ? 'aviso' : 'sucesso'} style={{ marginTop: 16 }}>
          {novoSaldo > 0 ? `Vai ficar devendo ${money(novoSaldo)}` : novoSaldo === 0 ? 'Conta quitada! ✓' : `Fica com crédito de ${money(-novoSaldo)}`}
        </p>
      )}
      {erro && <p className="erro">{erro}</p>}
      <button className="btn verde" style={{ marginTop: 16 }} onClick={salvar} disabled={salvando}>
        {salvando ? 'Salvando…' : 'Anotar pagamento'}
      </button>
    </div>
  )
}
