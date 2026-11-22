import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { addOpeningBalance, getBalance, getCustomer, listEntries, reverseEntry } from '../lib/api'
import { dateBR, money, parseMoney, todayISO } from '../lib/format'
import { addressText, hasAddress, mapsSearchLink } from '../lib/links'
import { PAYMENT_LABEL, type Entry } from '../lib/types'
import { useCarregar } from '../components/useCarregar'
import Topo from '../components/Topo'
import Janela from '../components/Janela'
import WhatsAppBotao from '../components/WhatsAppBotao'

interface Linha extends Entry {
  saldo: number
  estornado: boolean
}

/** Monta as linhas da ficha com o saldo acumulado, como na ficha de papel. */
export function linhasDaFicha(entries: Entry[]): Linha[] {
  const estornados = new Set(entries.filter((e) => e.reverses_entry_id).map((e) => e.reverses_entry_id))
  let saldo = 0
  return entries.map((e) => {
    saldo = Math.round((saldo + e.delta) * 100) / 100
    return { ...e, saldo, estornado: estornados.has(e.id) }
  })
}

function historico(e: Entry): string {
  if (e.kind === 'pagamento') return `Pagamento${e.payment_method ? ` (${PAYMENT_LABEL[e.payment_method]})` : ''}`
  return e.description
}

export default function Ficha() {
  const { id = '' } = useParams()
  const { dados, erro, carregando, recarregar } = useCarregar(async () => {
    const [cliente, entries, cadastro] = await Promise.all([getBalance(id), listEntries(id), getCustomer(id)])
    return { cliente, notas: cadastro.notes, linhas: linhasDaFicha(entries) }
  }, [id])
  const [corrigir, setCorrigir] = useState<Linha | null>(null)
  const [motivo, setMotivo] = useState('')
  const [erroCorrecao, setErroCorrecao] = useState<string | null>(null)
  const [saldoInicial, setSaldoInicial] = useState('')
  const [erroSaldo, setErroSaldo] = useState<string | null>(null)

  async function lancarSaldoInicial() {
    const v = parseMoney(saldoInicial)
    if (!v || v <= 0) return setErroSaldo('Digite quanto ela já devia. Ex.: 150,00')
    setErroSaldo(null)
    try {
      await addOpeningBalance(id, v, todayISO())
      setSaldoInicial('')
      recarregar()
    } catch (e) {
      setErroSaldo(e instanceof Error ? e.message : String(e))
    }
  }

  async function confirmarCorrecao() {
    if (!corrigir) return
    setErroCorrecao(null)
    try {
      await reverseEntry(corrigir, motivo)
      setCorrigir(null)
      setMotivo('')
      recarregar()
    } catch (e) {
      setErroCorrecao(e instanceof Error ? e.message : String(e))
    }
  }

  if (carregando && !dados) return <div className="carregando">Carregando…</div>
  if (erro || !dados) return <div className="page"><Topo titulo="Ficha" /><p className="erro">{erro}</p></div>
  const { cliente: c, linhas, notas } = dados

  return (
    <div className="page">
      <Topo titulo={c.name}>
        <Link to={`/clientes/${c.id}/editar`} aria-label="Editar" style={{ fontSize: '1.4rem', textDecoration: 'none' }}>
          ✏️
        </Link>
      </Topo>
      <p className="detalhe">
        {c.phone && <>📞 {c.phone} · </>}
        {c.neighborhood ?? 'Sem bairro'}
        {!c.active && <> · <span className="etiqueta amarela">inativa</span></>}
      </p>
      {hasAddress(c) && <p className="detalhe">{addressText(c)}{c.reference ? ` (${c.reference})` : ''}</p>}

      {notas && (
        <details className="cartao" style={{ marginTop: 8 }}>
          <summary className="detalhe" style={{ cursor: 'pointer' }}>📝 Observações</summary>
          <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{notas}</p>
        </details>
      )}

      <div className={'saldo-topo ' + (c.balance > 0 ? 'deve' : 'zerado')}>
        <div className="rotulo">{c.balance > 0 ? 'Deve' : 'Saldo'}</div>
        <div className="valor">{money(c.balance)}</div>
        {c.last_payment_on && <div className="rotulo">Último pagamento: {dateBR(c.last_payment_on)}</div>}
      </div>

      <div className="grade">
        <Link className="btn" to={`/venda?cliente=${c.id}`}>
          <span className="icone">🛍</span>Venda
        </Link>
        <Link className="btn verde" to={`/recebi?cliente=${c.id}`}>
          <span className="icone">💰</span>Recebi
        </Link>
      </div>
      <div className="linha" style={{ marginTop: 12 }}>
        <WhatsAppBotao nome={c.name} telefone={c.phone} saldo={c.balance} pequeno />
        {hasAddress(c) && (
          <a className="btn claro pequeno" href={mapsSearchLink(c)} target="_blank" rel="noreferrer">
            📍 Endereço
          </a>
        )}
      </div>

      <h2>Ficha</h2>
      {linhas.length === 0 ? (
        <div className="cartao">
          <p><b>Ficha nova.</b> Ela já devia alguma coisa antes do app?</p>
          <label htmlFor="saldo-inicial">Saldo anterior</label>
          <input id="saldo-inicial" inputMode="decimal" placeholder="0,00" value={saldoInicial} onChange={(e) => setSaldoInicial(e.target.value)} />
          {erroSaldo && <p className="erro">{erroSaldo}</p>}
          <button className="btn claro" style={{ marginTop: 10 }} onClick={lancarSaldoInicial}>
            Lançar saldo anterior
          </button>
        </div>
      ) : (
        <div style={{ overflowX: 'auto' }}>
        <table className="ficha">
          <thead>
            <tr>
              <th>Data</th>
              <th>Histórico</th>
              <th className="num">Débito</th>
              <th className="num">Crédito</th>
              <th className="num">Saldo</th>
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr
                key={l.id}
                className={(l.estornado ? 'estornado ' : '') + (l.kind === 'estorno' ? 'estorno ' : '') + (!l.estornado && l.kind !== 'estorno' ? 'tocavel' : '')}
                onClick={() => !l.estornado && l.kind !== 'estorno' && setCorrigir(l)}
              >
                <td>{dateBR(l.occurred_on).slice(0, 5)}</td>
                <td>{l.quantity ? <b>{l.quantity} </b> : null}{historico(l)}</td>
                <td className="num debito">{l.delta > 0 ? money(l.amount).replace('R$ ', '') : ''}</td>
                <td className="num credito">{l.delta < 0 ? money(l.amount).replace('R$ ', '') : ''}</td>
                <td className="num">{money(l.saldo).replace('R$ ', '')}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
      )}
      {linhas.length > 0 && <p className="detalhe" style={{ marginTop: 8 }}>Errou algum lançamento? Toque na linha para corrigir.</p>}

      <Janela aberta={Boolean(corrigir)} fechar={() => setCorrigir(null)}>
        {corrigir && (
          <>
            <h2>Corrigir lançamento?</h2>
            <p>
              <b>{historico(corrigir)}</b> — {money(corrigir.amount)} em {dateBR(corrigir.occurred_on)}
            </p>
            <p className="detalhe">
              O lançamento não é apagado: ele fica riscado na ficha e entra uma linha de correção que desfaz o valor. Depois, se precisar, lance o valor
              certo.
            </p>
            <label htmlFor="motivo">
              Motivo <span className="opcional">(opcional)</span>
            </label>
            <input id="motivo" value={motivo} onChange={(e) => setMotivo(e.target.value)} placeholder="Ex.: valor errado" />
            {erroCorrecao && <p className="erro">{erroCorrecao}</p>}
            <div className="pilha" style={{ marginTop: 14 }}>
              <button className="btn perigo" onClick={confirmarCorrecao}>
                Sim, corrigir
              </button>
              <button className="btn contorno" onClick={() => setCorrigir(null)}>
                Cancelar
              </button>
            </div>
          </>
        )}
      </Janela>
    </div>
  )
}
