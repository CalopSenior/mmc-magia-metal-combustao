import { DEFAULT_CAMERA } from '../config'
import type { Point } from '../math/hex'
import type { CameraSnapshot } from '../types'

const MIN_ZOOM = 0.08
const MAX_ZOOM = 2.4

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

export class Camera {
  private x = DEFAULT_CAMERA.x
  private y = DEFAULT_CAMERA.y
  private zoom = DEFAULT_CAMERA.zoom
  private width = 1
  private height = 1

  resize(width: number, height: number): void {
    this.width = Math.max(1, width)
    this.height = Math.max(1, height)
  }

  restore(snapshot: CameraSnapshot): void {
    this.x = snapshot.x
    this.y = snapshot.y
    this.zoom = clamp(snapshot.zoom, MIN_ZOOM, MAX_ZOOM)
  }

  fit(): void {
    this.x = 0
    this.y = 0
    this.zoom = this.width < 600 ? 0.72 : DEFAULT_CAMERA.zoom
  }

  /** Keeps the view inside a finite contract map (radius in cells), with a margin of two cells. */
  clampTo(radius: number | null, cellSize: number): void {
    if (radius === null) return
    const limit = (radius + 2) * cellSize
    this.x = clamp(this.x, -limit, limit)
    this.y = clamp(this.y, -limit, limit)
  }

  panByScreenDelta(deltaX: number, deltaY: number): void {
    this.x -= deltaX / this.zoom
    this.y -= deltaY / this.zoom
  }

  zoomAt(screenX: number, screenY: number, nextZoom: number): void {
    const before = this.screenToWorld(screenX, screenY)
    this.zoom = clamp(nextZoom, MIN_ZOOM, MAX_ZOOM)
    const after = this.screenToWorld(screenX, screenY)
    this.x += before.x - after.x
    this.y += before.y - after.y
  }

  zoomBy(factor: number): void {
    this.zoomAt(this.width / 2, this.height / 2, this.zoom * factor)
  }

  /** The cells on screen, plus `margin` cells all around (inclusive bounds). */
  visibleCells(cellSize: number, margin = 4): { minQ: number; minR: number; maxQ: number; maxR: number } {
    const topLeft = this.screenToWorld(0, 0), bottomRight = this.screenToWorld(this.viewportWidth, this.viewportHeight)
    return {
      minQ: Math.floor(Math.min(topLeft.x, bottomRight.x) / cellSize) - margin, maxQ: Math.ceil(Math.max(topLeft.x, bottomRight.x) / cellSize) + margin,
      minR: Math.floor(Math.min(topLeft.y, bottomRight.y) / cellSize) - margin, maxR: Math.ceil(Math.max(topLeft.y, bottomRight.y) / cellSize) + margin,
    }
  }

  screenToWorld(screenX: number, screenY: number): Point {
    return {
      x: (screenX - this.width / 2) / this.zoom + this.x,
      y: (screenY - this.height / 2) / this.zoom + this.y,
    }
  }

  worldToScreen(worldX: number, worldY: number): Point {
    return {
      x: (worldX - this.x) * this.zoom + this.width / 2,
      y: (worldY - this.y) * this.zoom + this.height / 2,
    }
  }

  getSnapshot(): CameraSnapshot {
    return { x: this.x, y: this.y, zoom: this.zoom }
  }

  get currentZoom(): number {
    return this.zoom
  }

  get viewX(): number {
    return this.x
  }

  get viewY(): number {
    return this.y
  }

  get viewportWidth(): number {
    return this.width
  }

  get viewportHeight(): number {
    return this.height
  }
}
