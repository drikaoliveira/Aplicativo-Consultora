import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader, type IScannerControls } from '@zxing/browser'
import { BarcodeFormat, DecodeHintType } from '@zxing/library'

const FORMATOS = [BarcodeFormat.EAN_13, BarcodeFormat.EAN_8, BarcodeFormat.UPC_A, BarcodeFormat.UPC_E, BarcodeFormat.CODE_128]

/** Tela cheia com a câmera traseira. Chama `lido` com o número do código e fecha. */
export default function LeitorCodigo({ lido, fechar }: { lido: (codigo: string) => void; fechar: () => void }) {
  const video = useRef<HTMLVideoElement>(null)
  const [erro, setErro] = useState<string | null>(null)

  useEffect(() => {
    let controles: IScannerControls | undefined
    let ativo = true
    const hints = new Map()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, FORMATOS)
    const leitor = new BrowserMultiFormatReader(hints, { delayBetweenScanAttempts: 150 })

    leitor
      .decodeFromConstraints({ video: { facingMode: { ideal: 'environment' } } }, video.current!, (resultado, _e, c) => {
        if (resultado && ativo) {
          ativo = false
          c.stop()
          navigator.vibrate?.(120)
          lido(resultado.getText())
        }
      })
      .then((c) => {
        controles = c
        if (!ativo) c.stop()
      })
      .catch((e: unknown) => {
        const msg = e instanceof Error ? e.name : ''
        setErro(
          msg === 'NotAllowedError'
            ? 'O celular não deu permissão para usar a câmera. Libere a câmera para este site nas configurações do navegador.'
            : 'Não foi possível abrir a câmera.',
        )
      })

    return () => {
      ativo = false
      controles?.stop()
    }
  }, [lido])

  return (
    <div className="leitor">
      <video ref={video} muted playsInline />
      <div className="mira" />
      <div className="rodape">
        {erro ? <p>{erro}</p> : <p>Aponte para o código de barras do produto</p>}
        <button className="btn contorno" onClick={fechar} style={{ marginTop: 10 }}>
          Fechar câmera
        </button>
      </div>
    </div>
  )
}
