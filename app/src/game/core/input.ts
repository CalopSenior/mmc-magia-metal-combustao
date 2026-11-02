import type { Camera } from './camera'

export type InputMode = 'inspect' | 'pan' | 'build' | 'demolish' | 'rotate' | 'copy'

interface InputCallbacks {
  onRotate?: (x:number,y:number) => void
  onCopy?: (x:number,y:number) => void
  canDraw?: () => boolean
  onStroke?: (points: readonly {x:number;y:number}[]) => void
  onStrokePreview?: (points: readonly {x:number;y:number}[]) => void
  onTap: (x: number, y: number, openGuide: boolean) => void
  onBuild: (x: number, y: number) => void
  onDemolish: (x: number, y: number) => void
  onHover: (x: number, y: number) => void
  onHoverEnd: () => void
  onClearSelection: () => void
  onTogglePause: () => void
  onCameraChange: () => void
}

interface PointerPosition {
  x: number
  y: number
}

const PAN_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'])

export class InputController {
  private mode: InputMode = 'pan'
  private readonly pointers = new Map<number, PointerPosition>()
  private lastX = 0
  private lastY = 0
  private downX = 0
  private downY = 0
  private moved = false
  private pinchDistance = 0
  private pinchX = 0
  private pinchY = 0
  private stroke: PointerPosition[] = []
  private cancelledGesture = false

  private readonly canvas: HTMLCanvasElement
  private readonly camera: Camera
  private readonly callbacks: InputCallbacks

  constructor(canvas: HTMLCanvasElement, camera: Camera, callbacks: InputCallbacks) {
    this.canvas = canvas
    this.camera = camera
    this.callbacks = callbacks
    canvas.addEventListener('pointerdown', this.handlePointerDown)
    canvas.addEventListener('pointermove', this.handlePointerMove)
    canvas.addEventListener('pointerup', this.handlePointerUp)
    canvas.addEventListener('pointercancel', this.handlePointerCancel)
    canvas.addEventListener('pointerleave', this.handlePointerLeave)
    canvas.addEventListener('wheel', this.handleWheel, { passive: false })
    canvas.addEventListener('keydown', this.handleKeyDown)
    canvas.addEventListener('contextmenu', this.preventContextMenu)
  }

  setMode(mode: InputMode): void {
    if (mode !== this.mode && this.pointers.size) this.cancelledGesture = true
    this.mode = mode
    this.callbacks.onStrokePreview?.([])
    if (mode !== 'inspect') this.callbacks.onHoverEnd()
  }
  get currentMode(): InputMode { return this.mode }

  dispose(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown)
    this.canvas.removeEventListener('pointermove', this.handlePointerMove)
    this.canvas.removeEventListener('pointerup', this.handlePointerUp)
    this.canvas.removeEventListener('pointercancel', this.handlePointerCancel)
    this.canvas.removeEventListener('pointerleave', this.handlePointerLeave)
    this.canvas.removeEventListener('wheel', this.handleWheel)
    this.canvas.removeEventListener('keydown', this.handleKeyDown)
    this.canvas.removeEventListener('contextmenu', this.preventContextMenu)
    this.pointers.clear()
  }

  private localPosition(event: PointerEvent | WheelEvent): PointerPosition {
    const bounds = this.canvas.getBoundingClientRect()
    return { x: event.clientX - bounds.left, y: event.clientY - bounds.top }
  }

  private updatePinchBaseline(): void {
    if (this.pointers.size < 2) return
    const iterator = this.pointers.values()
    const first = iterator.next().value as PointerPosition
    const second = iterator.next().value as PointerPosition
    this.pinchDistance = Math.hypot(second.x - first.x, second.y - first.y)
    this.pinchX = (first.x + second.x) / 2
    this.pinchY = (first.y + second.y) / 2
  }

  private readonly handlePointerDown = (event: PointerEvent): void => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    event.preventDefault()
    this.canvas.focus({ preventScroll: true })
    this.canvas.setPointerCapture(event.pointerId)
    const point = this.localPosition(event)
    if (this.pointers.size === 0) { this.cancelledGesture = false; this.stroke = [this.camera.screenToWorld(point.x,point.y)] }
    this.pointers.set(event.pointerId, point)
    this.lastX = point.x
    this.lastY = point.y
    this.downX = point.x
    this.downY = point.y
    this.moved = false
    if (this.pointers.size === 2) {
      this.cancelledGesture = true
      this.stroke = []
      this.callbacks.onStrokePreview?.([])
      this.updatePinchBaseline()
      this.moved = true
    }
  }

  private readonly handlePointerMove = (event: PointerEvent): void => {
    const point = this.localPosition(event)
    if (!this.pointers.has(event.pointerId)) {
      if (event.pointerType === 'mouse' && this.mode !== 'pan') this.callbacks.onHover(point.x, point.y)
      return
    }
    event.preventDefault()
    this.pointers.set(event.pointerId, point)

    if (this.pointers.size >= 2) {
      const iterator = this.pointers.values()
      const first = iterator.next().value as PointerPosition
      const second = iterator.next().value as PointerPosition
      const distance = Math.max(1, Math.hypot(second.x - first.x, second.y - first.y))
      const centerX = (first.x + second.x) / 2
      const centerY = (first.y + second.y) / 2
      if (this.pinchDistance > 0) {
        this.camera.zoomAt(centerX, centerY, this.camera.currentZoom * (distance / this.pinchDistance))
        this.camera.panByScreenDelta(centerX - this.pinchX, centerY - this.pinchY)
        this.callbacks.onCameraChange()
      }
      this.pinchDistance = distance
      this.pinchX = centerX
      this.pinchY = centerY
      this.moved = true
      return
    }

    if (Math.hypot(point.x - this.downX, point.y - this.downY) > 7) this.moved = true
    if (this.moved) {
      if (this.mode === 'build' && this.callbacks.canDraw?.() && !this.cancelledGesture) {
        if (this.stroke.length < 2048) this.stroke.push(this.camera.screenToWorld(point.x,point.y))
        this.callbacks.onStrokePreview?.(this.stroke)
      } else {
        this.camera.panByScreenDelta(point.x - this.lastX, point.y - this.lastY)
        this.callbacks.onCameraChange()
      }
    }
    this.lastX = point.x
    this.lastY = point.y
  }

  private readonly handlePointerUp = (event: PointerEvent): void => {
    if (!this.pointers.has(event.pointerId)) return
    const point = this.localPosition(event)
    const wasOnlyPointer = this.pointers.size === 1
    const openGuide = event.ctrlKey || event.metaKey
    if (wasOnlyPointer && !this.cancelledGesture && !this.moved) {
      if (this.mode === 'inspect' || this.mode === 'pan' || openGuide) this.callbacks.onTap(point.x, point.y, openGuide)
      else if (this.mode === 'build') this.callbacks.onBuild(point.x, point.y)
      else if (this.mode === 'demolish') this.callbacks.onDemolish(point.x, point.y)
      else if (this.mode === 'rotate') this.callbacks.onRotate?.(point.x,point.y)
      else if (this.mode === 'copy') this.callbacks.onCopy?.(point.x,point.y)
    } else if (wasOnlyPointer && !this.cancelledGesture && this.moved && this.mode === 'build' && this.callbacks.canDraw?.()) {
      this.stroke.push(this.camera.screenToWorld(point.x,point.y))
      this.callbacks.onStroke?.(this.stroke)
    }
    this.pointers.delete(event.pointerId)
    this.callbacks.onStrokePreview?.([])
    if (this.canvas.hasPointerCapture(event.pointerId)) this.canvas.releasePointerCapture(event.pointerId)
    if (this.pointers.size < 2) this.pinchDistance = 0
    if (this.pointers.size === 0) { this.moved = false; this.stroke = []; this.cancelledGesture = false }
  }

  private readonly handlePointerCancel = (event: PointerEvent): void => {
    this.pointers.delete(event.pointerId)
    this.stroke = []; this.cancelledGesture = this.pointers.size > 0
    this.callbacks.onStrokePreview?.([])
    this.pinchDistance = 0
    this.moved = false
  }

  private readonly handlePointerLeave = (): void => {
    if (this.pointers.size === 0) this.callbacks.onHoverEnd()
  }

  private readonly handleWheel = (event: WheelEvent): void => {
    event.preventDefault()
    const point = this.localPosition(event)
    this.camera.zoomAt(point.x, point.y, this.camera.currentZoom * Math.exp(-event.deltaY * 0.001))
    this.callbacks.onCameraChange()
  }

  private readonly handleKeyDown = (event: KeyboardEvent): void => {
    if (PAN_KEYS.has(event.key)) {
      event.preventDefault()
      const amount = 48
      const horizontal = event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a' ? amount : event.key === 'ArrowRight' || event.key.toLowerCase() === 'd' ? -amount : 0
      const vertical = event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' ? amount : event.key === 'ArrowDown' || event.key.toLowerCase() === 's' ? -amount : 0
      this.camera.panByScreenDelta(horizontal, vertical)
      this.callbacks.onCameraChange()
    } else if (event.key === '+' || event.key === '=') {
      event.preventDefault()
      this.camera.zoomBy(1.15)
      this.callbacks.onCameraChange()
    } else if (event.key === '-') {
      event.preventDefault()
      this.camera.zoomBy(1 / 1.15)
      this.callbacks.onCameraChange()
    } else if (event.key === 'Enter') {
      event.preventDefault()
      const x = this.camera.viewportWidth / 2
      const y = this.camera.viewportHeight / 2
      if (this.mode === 'inspect' || this.mode === 'pan' || event.ctrlKey || event.metaKey) this.callbacks.onTap(x, y, event.ctrlKey || event.metaKey)
      else if (this.mode === 'build') this.callbacks.onBuild(x, y)
      else if (this.mode === 'demolish') this.callbacks.onDemolish(x, y)
      else if (this.mode === 'rotate') this.callbacks.onRotate?.(x,y)
      else if (this.mode === 'copy') this.callbacks.onCopy?.(x,y)
    } else if (event.key === 'Escape') {
      this.callbacks.onClearSelection()
    } else if (event.key === ' ') {
      event.preventDefault()
      this.callbacks.onTogglePause()
    }
  }

  private readonly preventContextMenu = (event: MouseEvent): void => {
    event.preventDefault()
  }
}
