import { useEffect, useRef } from 'react'
import { drawMatrix, type PixelMatrix } from '@/game/content/pixelMatrices'

/** Draws a palette-index matrix on a small canvas and lets CSS scale it without smoothing. */
export function PixelArt({ matrix, palette, scale, className }: { matrix: PixelMatrix; palette: readonly string[]; scale: number; className?: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  const width = matrix[0].length, height = matrix.length
  useEffect(() => {
    const context = ref.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, width, height)
    drawMatrix(context, matrix, palette, 0, 0, 1)
  }, [matrix, palette, width, height])
  return <canvas ref={ref} width={width} height={height} className={className} aria-hidden="true"
    style={{ width: width * scale, height: height * scale, imageRendering: 'pixelated' }} />
}
