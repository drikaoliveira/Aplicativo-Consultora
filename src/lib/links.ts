import { onlyDigits } from './format'

export interface AddressLike {
  street?: string | null
  number?: string | null
  neighborhood?: string | null
  city?: string | null
}

export function addressText(a: AddressLike): string {
  const first = [a.street, a.number].filter(Boolean).join(', ')
  return [first, a.neighborhood, a.city].filter(Boolean).join(' - ')
}

export function hasAddress(a: AddressLike): boolean {
  return Boolean(a.street || a.neighborhood)
}

/** Número brasileiro com DDI 55 para o wa.me. */
export function whatsappNumber(phone: string | null | undefined): string | null {
  let d = onlyDigits(phone)
  if (!d) return null
  if (d.startsWith('0')) d = d.replace(/^0+/, '')
  if (d.length === 10 || d.length === 11) d = '55' + d
  return d.length >= 12 ? d : null
}

export function whatsappLink(phone: string | null | undefined, text: string): string | null {
  const n = whatsappNumber(phone)
  return n ? `https://wa.me/${n}?text=${encodeURIComponent(text)}` : null
}

export function mapsSearchLink(a: AddressLike): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addressText(a))}`
}

/**
 * Rota no Google Maps saindo da localização atual.
 * O Google aceita até 9 paradas intermediárias; a última vira destino.
 */
export const MAX_ROUTE_STOPS = 10

export function mapsRouteLink(stops: AddressLike[]): string | null {
  const list = stops.filter(hasAddress).slice(0, MAX_ROUTE_STOPS).map(addressText)
  if (list.length === 0) return null
  const destination = list[list.length - 1]
  const waypoints = list.slice(0, -1)
  let url = `https://www.google.com/maps/dir/?api=1&travelmode=driving&destination=${encodeURIComponent(destination)}`
  if (waypoints.length) url += `&waypoints=${encodeURIComponent(waypoints.join('|'))}`
  return url
}

export function chargeMessage(name: string, value: string): string {
  const first = name.trim().split(/\s+/)[0] ?? name
  return `Olá, ${first}. Tudo bem? Estou passando para lembrar que temos um valor de ${value} referente aos seus produtos Natura. Posso passar aí para receber ou, se preferir, você pode fazer o pagamento por Pix.`
}
