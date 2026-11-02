import { useEffect, useRef } from 'react'
import { PAVING_MATRICES, drawMatrix, pavingPalette, structurePalette } from '@/game/content/pixelMatrices'
import { structureMatrix } from '@/game/content/orientedMatrices'
import type { HexDirection, StructureType } from '@/game/types'

export function PixelStructureIcon({ type, direction=0, tier=1 }: { type: StructureType; direction?:HexDirection; tier?:number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const context = ref.current?.getContext('2d')
    if (!context) return
    context.clearRect(0, 0, 48, 48)
    if (type === 'paving') {
      const matrix = PAVING_MATRICES[Math.min(2, Math.max(0, tier - 1))]
      drawMatrix(context, matrix, pavingPalette(tier), 0, 0, 48 / matrix.length)
      return
    }
    const matrix = structureMatrix(type,direction)
    drawMatrix(context, matrix, structurePalette(type), 0, 0, 48 / matrix.length)
  }, [type,direction,tier])
  return <canvas ref={ref} width={48} height={48} className="pixel-structure-icon" aria-hidden="true" />
}
