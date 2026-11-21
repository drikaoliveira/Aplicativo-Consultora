import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'

export default function Topo({ titulo, voltar = true, children }: { titulo: string; voltar?: boolean; children?: ReactNode }) {
  const navigate = useNavigate()
  return (
    <div className="topo">
      {voltar && (
        <button className="voltar" onClick={() => navigate(-1)} aria-label="Voltar">
          ←
        </button>
      )}
      <h1>{titulo}</h1>
      {children}
    </div>
  )
}
