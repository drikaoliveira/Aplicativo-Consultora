import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import type { Session } from '@supabase/supabase-js'
import { isConfigured, supabase } from './lib/supabase'
import BottomNav from './components/BottomNav'
import Login from './pages/Login'
import NovaSenha from './pages/NovaSenha'
import TrocarSenha from './pages/TrocarSenha'
import Inicio from './pages/Inicio'
import Cobrar from './pages/Cobrar'
import CobrarBairro from './pages/CobrarBairro'
import Clientes from './pages/Clientes'
import ClienteForm from './pages/ClienteForm'
import Ficha from './pages/Ficha'
import NovaVenda from './pages/NovaVenda'
import Recebi from './pages/Recebi'
import PassarFichas from './pages/PassarFichas'
import Mais from './pages/Mais'
import Produtos from './pages/Produtos'
import ImportarProdutos from './pages/ImportarProdutos'

export default function App() {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const navigate = useNavigate()

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))
    const { data } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s)
      if (event === 'PASSWORD_RECOVERY') navigate('/nova-senha')
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])

  if (!isConfigured) {
    return (
      <div className="page">
        <h1>Configuração pendente</h1>
        <p className="aviso">
          Faltam as variáveis <code>VITE_SUPABASE_URL</code> e <code>VITE_SUPABASE_ANON_KEY</code>. Veja o README.
        </p>
      </div>
    )
  }
  if (session === undefined) return <div className="carregando">Carregando…</div>
  if (!session) {
    return (
      <Routes>
        <Route path="*" element={<Login />} />
      </Routes>
    )
  }

  return (
    <>
      <Routes>
        <Route path="/" element={<Inicio />} />
        <Route path="/cobrar" element={<Cobrar />} />
        <Route path="/cobrar/:bairro" element={<CobrarBairro />} />
        <Route path="/clientes" element={<Clientes />} />
        <Route path="/clientes/nova" element={<ClienteForm />} />
        <Route path="/clientes/:id" element={<Ficha />} />
        <Route path="/clientes/:id/editar" element={<ClienteForm />} />
        <Route path="/venda" element={<NovaVenda />} />
        <Route path="/recebi" element={<Recebi />} />
        <Route path="/passar-fichas" element={<PassarFichas />} />
        <Route path="/mais" element={<Mais />} />
        <Route path="/produtos" element={<Produtos />} />
        <Route path="/produtos/importar" element={<ImportarProdutos />} />
        <Route path="/nova-senha" element={<NovaSenha />} />
        <Route path="/trocar-senha" element={<TrocarSenha />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <BottomNav />
    </>
  )
}
