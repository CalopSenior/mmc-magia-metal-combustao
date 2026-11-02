# Marília — harmonização com os demais créditos

Ferramenta integrada `imagegen`, edição da arte aprovada como base de identidade pelo usuário. Fonte final: `marilia-harmonized-v6.png`.

Referência 1: `marilia-author-adapted-v5.png`, rosto, cabelo e figurino. Referência 2: `credits-artificers-atlas.png`, acabamento e proporção dos demais retratos. A revisão reduz contornos internos grossos e aparência de avatar, acrescentando sombras, textura e detalhe em pixels compatíveis com os demais.

O manifesto seleciona somente esta nova fonte para Marília, com recorte normalizado (x=0,07; y=0; largura=0,86; altura=0,86) para aproximar a escala do rosto à dos demais; os outros nove retratos permanecem idênticos. O jogo continua desenhando exclusivamente matrizes numéricas de 128×144 e até 35 cores.

## Prompt final

Use case: style-transfer / identity-preserve.
Restyle the SINGLE portrait of MARILIA in reference1 so she belongs visually to the exact same credit portrait set in reference2. The current reference1 is too cartoon-like, with very thick black contours, oversized shiny eyes, flat plastic skin and broad graphic hair ribbons. Correct those style mismatches. This requires a real rendering-style change, not merely replacing the background.

INPUT ROLES:
Reference1 = EDIT TARGET; authoritative for her identity, face shape, smile, nose, hair part and silhouette, pose, copper goggles on top of head, brown leather coat, canvas apron and small cyan/violet gemstone clasp. Keep the SAME woman identifiable.
Reference2 = AUTHORITATIVE OUTPUT ART STYLE AND PORTRAIT SCALE; ten portrait atlas. Use the finely shaded naturalistic pixel-art rendering visible especially in Denise row1col2, Gabriel row2col1, Thiago row3col1 and Aline row3col3. Do NOT copy any person's face, and do NOT resurrect the rejected Marilia in row2col3. Output just Marilia, never the atlas.

CHANGES REQUIRED:
- Naturalistic facial rendering at the same realism level as the atlas: subtle cheek/nose/eyelid volumes, delicately stepped skin ramps, small textured pixel clusters and selective shadow edges. Preserve her recognizable facial landmarks, oval face, smile/teeth and characteristic nose from reference1. Reduce the cartoon excess of the giant shiny eyes, using natural eyelids and proportionate irises, while retaining her eye shape and gaze.
- Thin the heavy near-black interior contour lines; let painted pixel value changes describe facial features. Use crisp outer silhouette contours similar in thickness to atlas, not thick sticker outlines. More intermediate tonal detail in face, hair and leather at the same visual density as the atlas.
- Keep long dark wavy hair with a smooth crown and visible individual strand clusters / natural waves; replace the thick uniform glossy hair ribbons with the finer dark textured rendering of the set.
- Match the atlas's earthy desaturated skin/leather palette, amber key light and restrained cool blue edge light. Avoid overly bright yellow highlights, orange outlines, lavender hair sheen and flat peach skin. No airbrushing or photoreal photo textures: still deliberate 16-bit inspired pixel-art clusters.
- Same head-and-shoulders scale as set: hair and head fill the upper roughly70% of portrait; shoulders and small visible apron occupy bottom. Head should feel as substantial as Denise/Aline, not a small full-torso character. Copper goggles fit on head, not enlarged. Preserve small gemstone without making it oversized neon jewellery.

COMPOSITION: SINGLE upright portrait in vertical8:9 aspect ratio, preferred1024x1152. Flat dark muted green background #1c2823. Complete hair/goggles at top with little breathing room. No frame, text, grid, extra people or props. Keep the costume/identity; change rendering language and framing to match the other artists exactly. The result must look like the same illustrator painted her alongside the other nine in reference2, not like a cartoon avatar pasted into their gallery.
