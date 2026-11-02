import type { Shipment } from '../types'

export const CARRIER_LOAD_TICKS=20
export const CARRIER_UNLOAD_TICKS=12
const clamp=(value:number)=>Math.max(0,Math.min(1,value))
/** Walking speed is identical outbound and homeward, excluding preparation. */
export function carrierWalkTicks(shipment:Shipment):number {
  return Math.max(1,shipment.arriveAt-shipment.departedAt-CARRIER_LOAD_TICKS)
}
export function carrierReturnAt(shipment:Shipment):number|null {
  return shipment.deliveredAt===undefined?null:shipment.deliveredAt+CARRIER_UNLOAD_TICKS+carrierWalkTicks(shipment)
}
export function carrierTravel(shipment:Shipment,tick:number) {
  const duration=Math.max(1,shipment.arriveAt-shipment.departedAt),load=Math.min(CARRIER_LOAD_TICKS,duration-1)
  const elapsed=Math.max(0,tick-shipment.departedAt)
  return elapsed<load?{pose:'pickup' as const,progress:elapsed/load,travel:0}:
    {pose:elapsed>=duration?'carry' as const:'walk' as const,progress:1,travel:clamp((elapsed-load)/(duration-load))}
}
export function carrierHomeward(shipment:Shipment,tick:number) {
  const elapsed=Math.max(0,tick-(shipment.deliveredAt??tick))
  return elapsed<CARRIER_UNLOAD_TICKS?
    {pose:'deliver' as const,progress:elapsed/(CARRIER_UNLOAD_TICKS-1),travel:1}:
    {pose:'return' as const,progress:1,travel:1-clamp((elapsed-CARRIER_UNLOAD_TICKS)/carrierWalkTicks(shipment))}
}
