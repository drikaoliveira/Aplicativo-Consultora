import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { traduzErro } from '../lib/api'

export default function Login() {
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [aviso, setAviso] = useState<string | null>(null)
  const [enviando, setEnviando] = useState(false)

  async function entrar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setEnviando(true)
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password: senha })
    setEnviando(false)
    if (error) setErro(traduzErro(error.message))
  }

  async function esqueci() {
    setErro(null)
    if (!email.trim()) {
      setErro('Digite seu e-mail acima e toque de novo em "Esqueci a senha".')
      return
    }
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin + '/nova-senha',
    })
    if (error) setErro(traduzErro(error.message))
    else setAviso('Enviamos um e-mail com um link para criar uma senha nova.')
  }

  return (
    <div className="page" style={{ paddingTop: 48 }}>
      <div style={{ textAlign: 'center', marginBottom: 24 }}>
        <img src="/icon.svg" alt="" width={84} height={84} />
        <h1 style={{ marginTop: 12 }}>Minhas Fichas</h1>
        <p className="detalhe">Clientes, vendas e cobranças</p>
      </div>
      <form onSubmit={entrar}>
        <label htmlFor="email">E-mail</label>
        <input id="email" type="email" inputMode="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <label htmlFor="senha">Senha</label>
        <input id="senha" type="password" autoComplete="current-password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
        {erro && <p className="erro">{erro}</p>}
        {aviso && <p className="sucesso">{aviso}</p>}
        <div className="pilha" style={{ marginTop: 20 }}>
          <button className="btn" disabled={enviando}>
            {enviando ? 'Entrando…' : 'Entrar'}
          </button>
          <button type="button" className="btn contorno" onClick={esqueci}>
            Esqueci a senha
          </button>
        </div>
      </form>
    </div>
  )
}
