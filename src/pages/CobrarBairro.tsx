import { useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { listBalances } from '../lib/api'
import { agruparPorBairro, chaveBairro, etiquetaDias } from '../lib/cobranca'
import { money } from '../lib/format'
import { addressText, hasAddress, MAX_ROUTE_STOPS, mapsRouteLink } from '../lib/links'
import { useCarregar } from '../components/useCarregar'
import Topo from '../components/Topo'
import WhatsAppBotao from '../components/WhatsAppBotao'

export default function CobrarBairro() {
  const { bairro = '' } = useParams()
  const { dados, erro, carregando } = useCarregar(listBalances)
  const grupo = agruparPorBairro((dados ?? []).filter((c) => c.active)).find((g) => chaveBairro(g.bairro) === bairro)
  const [marcadas, setMarcadas] = useState<Set<string>>(new Set())

  const clientes = grupo?.clientes ?? []
  const escolhidas = clientes.filter((c) => marcadas.has(c.id))
  const rota = mapsRouteLink(escolhidas)
  const semEndereco = escolhidas.filter((c) => !hasAddress(c)).length

  function alternar(id: string) {
    setMarcadas((m) => {
      const n = new Set(m)
      if (n.has(id)) n.delete(id)
      else n.add(id)
      return n
    })
  }

  return (
    <div className="page">
      <Topo titulo={grupo?.bairro ?? 'Bairro'} />
      {erro && <p className="erro">{erro}</p>}
      {carregando && <p className="carregando">Carregando…</p>}
      {grupo && (
        <p className="detalhe">
          {clientes.length} {clientes.length === 1 ? 'cliente' : 'clientes'} · <b>{money(grupo.total)}</b> a receber. Marque quem você vai visitar e
          monte a rota.
        </p>
      )}
      {!carregando && !grupo && <p className="vazio">Ninguém devendo neste bairro.</p>}

      {clientes.map((c) => {
        const et = etiquetaDias(c.dias)
        return (
          <div key={c.id} className="cartao">
            <label className="check" style={{ margin: 0, fontWeight: 400 }}>
              <input type="checkbox" checked={marcadas.has(c.id)} onChange={() => alternar(c.id)} />
              <div style={{ flex: 1 }}>
                <div className="item-lista">
                  <div>
                    <div className="nome">{c.name}</div>
                    <div className="detalhe">{hasAddress(c) ? addressText(c) : 'Sem endereço'}</div>
                  </div>
                  <div className="direita valor-devido">{money(c.balance)}</div>
                </div>
                <span className={`etiqueta ${et.cor}`}>{et.texto}</span>
              </div>
            </label>
            <div className="linha" style={{ marginTop: 10 }}>
              <WhatsAppBotao nome={c.name} telefone={c.phone} saldo={c.balance} pequeno />
              <Link className="btn verde pequeno" to={`/recebi?cliente=${c.id}`}>
                💰 Recebi
              </Link>
            </div>
            <Link to={`/clientes/${c.id}`} className="detalhe" style={{ display: 'block', marginTop: 8 }}>
              Ver ficha ›
            </Link>
          </div>
        )
      })}

      {clientes.length > 0 && (
        <div style={{ position: 'sticky', bottom: 'calc(84px + env(safe-area-inset-bottom))', marginTop: 16 }}>
          {semEndereco > 0 && <p className="aviso">{semEndereco} escolhida(s) sem endereço ficam fora da rota.</p>}
          {escolhidas.length > MAX_ROUTE_STOPS && (
            <p className="aviso">O Google Maps aceita até {MAX_ROUTE_STOPS} paradas por rota. As primeiras {MAX_ROUTE_STOPS} entram.</p>
          )}
          <a
            className="btn"
            href={rota ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!rota}
            style={!rota ? { opacity: 0.5, pointerEvents: 'none' } : undefined}
          >
            🗺 Abrir rota ({escolhidas.length})
          </a>
        </div>
      )}
    </div>
  )
}
