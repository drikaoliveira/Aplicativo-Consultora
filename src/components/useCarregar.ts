import { useCallback, useEffect, useState } from 'react'

/** Carrega dados assíncronos com estado de carregando/erro e função para recarregar. */
export function useCarregar<T>(fn: () => Promise<T>, deps: unknown[] = []) {
  const [dados, setDados] = useState<T | undefined>(undefined)
  const [erro, setErro] = useState<string | null>(null)
  const [carregando, setCarregando] = useState(true)

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const carregar = useCallback(fn, deps)

  const recarregar = useCallback(async () => {
    setCarregando(true)
    setErro(null)
    try {
      setDados(await carregar())
    } catch (e) {
      setErro(e instanceof Error ? e.message : String(e))
    } finally {
      setCarregando(false)
    }
  }, [carregar])

  useEffect(() => {
    recarregar()
  }, [recarregar])

  return { dados, erro, carregando, recarregar }
}
