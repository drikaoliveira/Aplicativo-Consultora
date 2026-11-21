import type { ReactNode } from 'react'

export default function Janela({ aberta, fechar, children }: { aberta: boolean; fechar: () => void; children: ReactNode }) {
  if (!aberta) return null
  return (
    <div className="camada" onClick={fechar}>
      <div className="janela" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}
