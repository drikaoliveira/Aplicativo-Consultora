import { useState, type FormEvent } from 'react'
import { supabase } from '../lib/supabase'
import { traduzErro } from '../lib/api'
import Topo from '../components/Topo'

export function validarNovaSenha(atual: string, nova: string, repetir: string): string | null {
  if (!atual) return 'Digite a senha que você usa hoje.'
  if (nova.length < 6) return 'A senha nova precisa ter pelo menos 6 caracteres.'
  if (nova !== repetir) return 'As duas senhas novas não estão iguais.'
  if (nova === atual) return 'A senha nova é igual à atual.'
  return null
}

export default function TrocarSenha() {
  const [atual, setAtual] = useState('')
  const [nova, setNova] = useState('')
  const [repetir, setRepetir] = useState('')
  const [mostrar, setMostrar] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [ok, setOk] = useState(false)
  const [salvando, setSalvando] = useState(false)

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    const problema = validarNovaSenha(atual, nova, repetir)
    if (problema) return setErro(problema)
    setSalvando(true)
    try {
      const { data } = await supabase.auth.getUser()
      const email = data.user?.email
      if (!email) throw new Error('Não foi possível identificar a usuária. Entre de novo.')
      // confere a senha atual antes de trocar
      const conf = await supabase.auth.signInWithPassword({ email, password: atual })
      if (conf.error) throw new Error(/Invalid login/i.test(conf.error.message) ? 'A senha atual está errada.' : traduzErro(conf.error.message))
      const { error } = await supabase.auth.updateUser({ password: nova })
      if (error) throw new Error(traduzErro(error.message))
      setOk(true)
      setAtual('')
      setNova('')
      setRepetir('')
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  const tipo = mostrar ? 'text' : 'password'
  return (
    <div className="page">
      <Topo titulo="🔑 Trocar senha" />
      {ok ? (
        <>
          <p className="sucesso">Senha trocada! Da próxima vez que precisar entrar, use a senha nova.</p>
          <p className="detalhe">Se o Chrome perguntar se quer atualizar a senha salva, toque em “Atualizar”.</p>
        </>
      ) : (
        <form onSubmit={salvar}>
          <label htmlFor="atual">Senha atual</label>
          <input id="atual" type={tipo} autoComplete="current-password" value={atual} onChange={(e) => setAtual(e.target.value)} />
          <label htmlFor="nova">Senha nova <span className="opcional">(pelo menos 6 caracteres)</span></label>
          <input id="nova" type={tipo} autoComplete="new-password" value={nova} onChange={(e) => setNova(e.target.value)} />
          <label htmlFor="repetir">Repita a senha nova</label>
          <input id="repetir" type={tipo} autoComplete="new-password" value={repetir} onChange={(e) => setRepetir(e.target.value)} />
          <label className="check" style={{ fontWeight: 400 }}>
            <input type="checkbox" checked={mostrar} onChange={(e) => setMostrar(e.target.checked)} />
            Mostrar as senhas
          </label>
          {erro && <p className="erro">{erro}</p>}
          <button className="btn" style={{ marginTop: 20 }} disabled={salvando}>
            {salvando ? 'Salvando…' : 'Trocar senha'}
          </button>
        </form>
      )}
    </div>
  )
}
