import { NavLink } from 'react-router-dom'

const cls = ({ isActive }: { isActive: boolean }) => (isActive ? 'ativo' : '')

export default function BottomNav() {
  return (
    <nav className="menu">
      <NavLink to="/" end className={cls}>
        <span className="icone">🏠</span>Início
      </NavLink>
      <NavLink to="/clientes" className={cls}>
        <span className="icone">👤</span>Clientes
      </NavLink>
      <NavLink to="/venda" className={({ isActive }) => 'lancar ' + cls({ isActive })}>
        <span className="icone">🛍</span>Venda
      </NavLink>
      <NavLink to="/cobrar" className={cls}>
        <span className="icone">📍</span>Cobrar
      </NavLink>
      <NavLink to="/mais" className={cls}>
        <span className="icone">☰</span>Mais
      </NavLink>
    </nav>
  )
}
