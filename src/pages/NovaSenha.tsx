import { useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { traduzErro } from '../lib/api'
import Topo from '../components/Topo'

export default function NovaSenha() {
  const [senha, setSenha] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const navigate = useNavigate()

  async function salvar(e: FormEvent) {
    e.preventDefault()
    if (senha.length < 6) return setErro('A senha precisa ter pelo menos 6 caracteres.')
    const { error } = await supabase.auth.updateUser({ password: senha })
    if (error) setErro(traduzErro(error.message))
    else navigate('/', { replace: true })
  }

  return (
    <div className="page">
      <Topo titulo="Nova senha" voltar={false} />
      <form onSubmit={salvar}>
        <label htmlFor="senha">Digite a senha nova</label>
        <input id="senha" type="password" autoComplete="new-password" value={senha} onChange={(e) => setSenha(e.target.value)} />
        {erro && <p className="erro">{erro}</p>}
        <button className="btn" style={{ marginTop: 20 }}>
          Salvar senha
        </button>
      </form>
    </div>
  )
}
