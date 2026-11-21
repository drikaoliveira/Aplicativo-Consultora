import { useEffect, useState, type FormEvent } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { getCustomer, listBalances, saveCustomer } from '../lib/api'
import Topo from '../components/Topo'
import CamposCliente, { bairrosExistentes, CHAVE_CIDADE, formVazio, type FormCliente } from '../components/CamposCliente'
import { useCarregar } from '../components/useCarregar'

export default function ClienteForm() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [form, setForm] = useState<FormCliente>({ ...formVazio, city: localStorage.getItem(CHAVE_CIDADE) ?? '' })
  const [erro, setErro] = useState<string | null>(null)
  const [salvando, setSalvando] = useState(false)
  const { dados: todas } = useCarregar(listBalances)

  useEffect(() => {
    if (!id) return
    getCustomer(id)
      .then((c) =>
        setForm({
          name: c.name, phone: c.phone ?? '', street: c.street ?? '', number: c.number ?? '', complement: c.complement ?? '',
          neighborhood: c.neighborhood ?? '', city: c.city ?? '', reference: c.reference ?? '', notes: c.notes ?? '',
          active: String(c.active),
        }),
      )
      .catch((e) => setErro(e.message))
  }, [id])

  async function salvar(e: FormEvent) {
    e.preventDefault()
    setErro(null)
    setSalvando(true)
    try {
      const { active, ...resto } = form
      const c = await saveCustomer({ ...resto, active: active === 'true' }, id)
      if (form.city) localStorage.setItem(CHAVE_CIDADE, form.city)
      navigate(`/clientes/${c.id}`, { replace: true })
    } catch (err) {
      setErro(err instanceof Error ? err.message : String(err))
      setSalvando(false)
    }
  }

  return (
    <div className="page">
      <Topo titulo={id ? 'Editar cliente' : 'Nova cliente'} />
      <form onSubmit={salvar}>
        <CamposCliente form={form} mudar={(k, v) => setForm((f) => ({ ...f, [k]: v }))} bairros={bairrosExistentes(todas ?? [])} />
        {id && (
          <label className="check" style={{ marginTop: 18 }}>
            <input type="checkbox" checked={form.active === 'false'} onChange={(e) => setForm((f) => ({ ...f, active: String(!e.target.checked) }))} />
            Cliente inativa (não aparece nas listas)
          </label>
        )}
        {erro && <p className="erro">{erro}</p>}
        <button className="btn" style={{ marginTop: 20 }} disabled={salvando}>
          {salvando ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}
