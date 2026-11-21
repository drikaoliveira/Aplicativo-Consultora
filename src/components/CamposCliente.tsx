import type { CustomerInput } from '../lib/api'

export type FormCliente = Required<{ [K in keyof CustomerInput]: string }>

export const formVazio: FormCliente = {
  name: '', phone: '', street: '', number: '', complement: '', neighborhood: '', city: '', reference: '', notes: '',
  active: 'true',
}

/** Campos de cadastro. `bairros` alimenta a sugestão, para não criar "Floresta" e "floresta" separados. */
export default function CamposCliente({
  form, mudar, bairros, completo = true,
}: {
  form: FormCliente
  mudar: (k: keyof FormCliente, v: string) => void
  bairros: string[]
  completo?: boolean
}) {
  const campo = (k: keyof FormCliente) => ({ value: form[k], onChange: (e: { target: { value: string } }) => mudar(k, e.target.value) })
  return (
    <>
      <label htmlFor="nome">Nome</label>
      <input id="nome" autoCapitalize="words" {...campo('name')} required />

      <label htmlFor="bairro">Bairro</label>
      <input id="bairro" list="lista-bairros" autoCapitalize="words" {...campo('neighborhood')} />
      <datalist id="lista-bairros">
        {bairros.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      <label htmlFor="telefone">
        Telefone / WhatsApp <span className="opcional">(com DDD)</span>
      </label>
      <input id="telefone" type="tel" inputMode="tel" placeholder="(31) 99999-9999" {...campo('phone')} />

      <label htmlFor="rua">Rua</label>
      <input id="rua" autoCapitalize="words" {...campo('street')} />

      <div className="linha">
        <div>
          <label htmlFor="numero">Número</label>
          <input id="numero" inputMode="numeric" {...campo('number')} />
        </div>
        <div>
          <label htmlFor="complemento">
            Compl. <span className="opcional">(opcional)</span>
          </label>
          <input id="complemento" {...campo('complement')} />
        </div>
      </div>

      {completo && (
        <>
          <label htmlFor="cidade">Cidade</label>
          <input id="cidade" autoCapitalize="words" {...campo('city')} />

          <label htmlFor="referencia">
            Ponto de referência <span className="opcional">(opcional)</span>
          </label>
          <input id="referencia" {...campo('reference')} />

          <label htmlFor="obs">
            Observações <span className="opcional">(opcional)</span>
          </label>
          <textarea id="obs" style={{ minHeight: 90 }} {...campo('notes')} />
        </>
      )}
    </>
  )
}

export function bairrosExistentes(lista: { neighborhood: string | null }[]): string[] {
  const vistos = new Map<string, string>()
  for (const c of lista) {
    const b = c.neighborhood?.trim()
    if (b && !vistos.has(b.toLowerCase())) vistos.set(b.toLowerCase(), b)
  }
  return [...vistos.values()].sort((a, b) => a.localeCompare(b, 'pt-BR'))
}

/** Última cidade usada, para já vir preenchida. */
export const CHAVE_CIDADE = 'ultima-cidade'
