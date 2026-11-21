import { useState, type FormEvent } from 'react'
import { addOpeningBalance, listBalances, saveCustomer } from '../lib/api'
import { money, normalize, parseMoney, todayISO } from '../lib/format'
import Topo from '../components/Topo'
import CamposCliente, { bairrosExistentes, CHAVE_CIDADE, formVazio, type FormCliente } from '../components/CamposCliente'
import { useCarregar } from '../components/useCarregar'

export default function PassarFichas() {
  const novoForm = (): FormCliente => ({ ...formVazio, city: localStorage.getItem(CHAVE_CIDADE) ?? '' })
  const [form, setForm] = useState<FormCliente>(novoForm)
  const [saldo, setSaldo] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [feitas, setFeitas] = useState<string[]>([])
  const [salvando, setSalvando] = useState(false)
  const { dados: todas, recarregar } = useCarregar(listBalances)

  const repetida = form.name.trim().length > 2 && (todas ?? []).find((c) => normalize(c.name) === normalize(form.name))

  async function salvar(e: FormEvent) {
    e.preventDefault()
    const valor = saldo.trim() ? parseMoney(saldo) : 0
    if (valor === null || valor < 0) return setErro('O saldo da ficha não parece um valor. Ex.: 119,80')
    setErro(null)
    setSalvando(true)
    try {
      const { active: _a, ...dadosCliente } = form
      const c = await saveCustomer(dadosCliente)
      if (valor > 0) await addOpeningBalance(c.id, valor, todayISO())
      if (form.city) localStorage.setItem(CHAVE_CIDADE, form.city)
      setFeitas((f) => [`${c.name} — ${money(valor)}`, ...f])
      setForm(novoForm())
      setSaldo('')
      recarregar()
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
    } finally {
      setSalvando(false)
    }
  }

  return (
    <div className="page">
      <Topo titulo="📋 Passar fichas" />
      <p className="detalhe">
        Uma ficha por vez. Comece pelas clientes que estão devendo. O <b>saldo</b> é o último valor da coluna “saldo” da ficha.
      </p>
      {feitas.length > 0 && <p className="sucesso">✓ {feitas.length} ficha(s) passada(s) agora. Última: {feitas[0]}</p>}
      <form onSubmit={salvar}>
        <CamposCliente form={form} mudar={(k, v) => setForm((f) => ({ ...f, [k]: v }))} bairros={bairrosExistentes(todas ?? [])} completo={false} />
        {repetida && <p className="aviso">Já existe uma cliente chamada “{repetida.name}”. Confira se não é a mesma.</p>}

        <label htmlFor="saldo">Saldo da ficha (quanto deve hoje)</label>
        <input id="saldo" className="valor-grande" inputMode="decimal" placeholder="0,00" value={saldo} onChange={(e) => setSaldo(e.target.value)} />

        {erro && <p className="erro">{erro}</p>}
        <button className="btn" style={{ marginTop: 20 }} disabled={salvando || !form.name.trim()}>
          {salvando ? 'Salvando…' : 'Salvar e próxima ficha'}
        </button>
      </form>
    </div>
  )
}
