import { useState } from 'react'
import Janela from './Janela'
import { chargeMessage, whatsappLink, whatsappNumber } from '../lib/links'
import { money } from '../lib/format'

/** Abre uma janela com a mensagem de cobrança editável e só então abre o WhatsApp. Nunca envia sozinho. */
export default function WhatsAppBotao({ nome, telefone, saldo, pequeno }: { nome: string; telefone: string | null; saldo: number; pequeno?: boolean }) {
  const [aberto, setAberto] = useState(false)
  const [texto, setTexto] = useState('')
  const temNumero = Boolean(whatsappNumber(telefone))

  function abrir() {
    setTexto(saldo > 0 ? chargeMessage(nome, money(saldo)) : `Olá, ${nome.split(' ')[0]}! Tudo bem?`)
    setAberto(true)
  }

  if (!temNumero) {
    return (
      <button className={'btn claro' + (pequeno ? ' pequeno' : '')} disabled title="Sem telefone cadastrado">
        💬 Sem WhatsApp
      </button>
    )
  }

  const link = whatsappLink(telefone, texto)
  return (
    <>
      <button className={'btn claro' + (pequeno ? ' pequeno' : '')} onClick={abrir}>
        💬 WhatsApp
      </button>
      <Janela aberta={aberto} fechar={() => setAberto(false)}>
        <h2>Mensagem para {nome.split(' ')[0]}</h2>
        <p className="detalhe">Você pode mudar o texto antes de abrir o WhatsApp.</p>
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="pilha" style={{ marginTop: 12 }}>
          <a className="btn verde" href={link ?? '#'} target="_blank" rel="noreferrer" onClick={() => setAberto(false)}>
            Abrir no WhatsApp
          </a>
          <button className="btn contorno" onClick={() => setAberto(false)}>
            Cancelar
          </button>
        </div>
      </Janela>
    </>
  )
}
