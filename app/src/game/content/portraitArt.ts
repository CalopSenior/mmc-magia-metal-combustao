import { PORTRAIT_DATA } from './portraitData.generated'

/** Palette-index source art; drawn at its native integer pixel scale. */
export interface PortraitArt { readonly palette: readonly string[]; readonly rows: readonly string[] }

/** All ten portraits share the author's artificer art direction. */
export const PORTRAIT_ART:Readonly<Record<string,PortraitArt>> = PORTRAIT_DATA