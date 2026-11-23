import { Link } from 'react-router-dom'
import { exportAll, isAdmin } from '../lib/api'
import { supabase } from '../lib/supabase'
import { useEffect, useState } from 'react'
import Papa from 'papaparse'

function baixar(nome: string, conteudo: string) {
  const blob = new Blob(['﻿' + conteudo], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = nome
  a.click()
  URL.revokeObjectURL(a.href)
}

export default function Mais() {
  const [msg, setMsg] = useState<string | null>(null)
  const [email, setEmail] = useState<string | null>(null)
  const [admin, setAdmin] = useState(false)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setEmail(data.user?.email ?? null))
    isAdmin().then(setAdmin)
  }, [])

  async function exportar() {
    setMsg('Preparando…')
    try {
      const { customers, entries } = await exportAll()
      const nomes = new Map(customers.map((c) => [c.id, c.name]))
      const hoje = new Date().toISOString().slice(0, 10)
      baixar(`clientes-${hoje}.csv`, Papa.unparse(customers, { delimiter: ';' }))
      baixar(
        `lancamentos-${hoje}.csv`,
        Papa.unparse(
          entries.map((e) => ({ cliente: nomes.get(e.customer_id), ...e, amount: String(e.amount).replace('.', ','), delta: String(e.delta).replace('.', ',') })),
          { delimiter: ';' },
        ),
      )
      setMsg('Arquivos baixados.')
    } catch (e) {
      setMsg(e instanceof Error ? e.message : String(e))
    }
  }

  return (
    <div className="page">
      <h1>☰ Mais</h1>
      {email && (
        <p className="detalhe" style={{ marginBottom: 14 }}>
          Entrou como <b>{email}</b>
          {admin && <> · <span className="etiqueta verde">administradora do catálogo</span></>}
        </p>
      )}
      <div className="pilha">
        <Link className="btn claro" to="/passar-fichas">📋 Passar fichas de papel</Link>
        <Link className="btn claro" to="/clientes/importar">📥 Importar clientes (planilha)</Link>
        <Link className="btn claro" to="/produtos">🧴 Produtos</Link>
        <Link className="btn claro" to="/produtos/importar">📥 Importar produtos (planilha)</Link>
        <button className="btn claro" onClick={exportar}>💾 Baixar cópia dos dados</button>
        <Link className="btn claro" to="/trocar-senha">🔑 Trocar minha senha</Link>
        {msg && <p className="detalhe">{msg}</p>}
        <button className="btn contorno" onClick={() => supabase.auth.signOut()}>Sair</button>
        <p className="detalhe" style={{ textAlign: 'center' }}>Versão {__VERSAO__}</p>
      </div>
    </div>
  )
}
