# Dani e Marília — revisão 5

Ferramenta integrada `imagegen`, sem CLI/API externa. Fontes finais: `daniela-artificer-v5.png` e `marilia-author-adapted-v5.png`. O jogo usa apenas as matrizes numéricas compiladas dessas fontes.

Marília usa a ilustração criada pelo usuário (`codex-clipboard-1d363540-a9fa-45f8-b635-d176a4c2ef6f.png`) como autoridade para rosto, cabelo, sorriso, pose e figurino. A adaptação muda o fundo e harmoniza o acabamento; as tentativas anteriores foram substituídas.

Dani usa as novas fotografias. A ordem usada foi: `codex-clipboard-151b839b-028e-4bbc-bbdb-706d60c10199.png`, `codex-clipboard-e7a7ba96-4411-459b-9100-c42598cfe0a6.png`, `codex-clipboard-d2f4a633-31e2-4adb-b76d-b83862352858.png`, `codex-clipboard-6133a6be-99fe-4dab-a420-8b939c639765.png`. O atlas original serve apenas de referência de estilo.

O manifesto `credit-portrait-sources.json` substitui somente essas duas pessoas; os demais oito retratos são preservados.

## Marília — prompt final

Use case: precise-object-edit / identity-preserve.
EDIT reference1, the artist-supplied pixel portrait of MARILIA. This exact illustration is APPROVED by the user for facial likeness. Preserve her illustrated facial identity. Do not invent a new person or derive a new face from photographs.
Reference1 = EDIT TARGET and authoritative face, hair, smile, goggles, pose, clothes.
Reference2 = existing game credits atlas, STYLE AND BACKGROUND REFERENCE ONLY; never copy any of its faces.

Primary request: adapt the supplied Marilia artwork into the game's coherent credit portraits with minimal changes. Replace its white background with flat dark muted green #1c2823; keep clean pixel edges. Harmonize the palette subtly with reference2's warm amber and cool blue edge light, dark contours and earthy leather. Keep the original brown leather high collar, brass hardware, canvas apron, violet/cyan jewel clasp, goggles resting above forehead, long dark wavy hair and her exact distinctive face.
CRITICAL INVARIANTS: Match the same eye shapes/spacing, eyebrow shapes, nose silhouette, smiling mouth and teeth, cheek/chin contours, hair part, hair outline and direction of gaze from reference1. Keep the face effectively unchanged, not a reinterpretation or beautification. Do not copy the rejected Marilia from row2col3 in reference2. Do not make the face rounder, change nose or enlarge eyes.
Composition: SINGLE upright head-and-shoulders portrait, vertical8:9 source (1024x1152 preferred). Preserve facial proportions without stretching. Center at comparable head scale to atlas portraits, top of hair/goggles fully visible with small margin, crop at upper chest with apron visible. Extend dark background or lower clothing as needed for aspect ratio; never squeeze the face. Crisp deliberate pixel clusters; no smoothing, no photo texture.
No text, frame, grid, border, white halo, new props or other people. Only one portrait. This is a restrained production adaptation of the user's own artwork.

## Dani — prompt final

Use case: identity-preserve / style-transfer.
Create ONE faithful pixel-art portrait of DANIELA (DANI), the same real person in photos1–4, as an island-owning master artificer in M.M.C.
INPUTS: reference1 is Dani smiling frontally and is the primary facial likeness reference. Reference2 is Dani smiling in a group; portray only her, the smiling foreground woman. Reference3 is Dani facing down, use her real facial proportions, hair part, eyebrows and nose. Reference4 is her profile, clarifying nose, chin and hair. Reference5 is the existing credits atlas, STYLE / COSTUME / SCALE REFERENCE ONLY. Its row1col1 is a rejected earlier Dani; do NOT reuse its face.

Make the facial identity from the photos the priority. Capture her broad softly rounded oval face, real fuller cheeks, her own thick gently arched dark eyebrows, smiling narrow almond eyes, natural broad nose with rounded tip, her distinctive wide bright toothy smile and lip shape, chin and soft jawline. Match the actual landmark spacing of photo1. Avoid the long narrow face or glamorous generic fantasy face of the rejected portrait. No enlarged eyes, heavily made-up eyelids or artificial beauty-template features. Do not copy any other person's face from the atlas.
Hair: near-black naturally curly shoulder-length hair, smooth center/slightly off-center parted crown, looser waves near crown and compact curls at ends, as photos1–4; no giant spiraling ringlets or bright brown highlights. Natural face framing, her full hair contained in the portrait.
Pose: mostly frontal head and shoulders, small natural turn toward viewer, broad warm smile closely based on photo1, no hands.
Outfit: olive artificer's field coat over muted dark plum, weathered canvas apron, brown leather straps and copper/brass clasps, matching her role in the credits.
Art: refined16-bit pixel-art bust, deliberate clustered pixels, dark contours, controlled earthy palette, warm amber light and cool blue rim highlights consistent with atlas. Same amount of facial detail as the existing portraits. No photorealistic airbrushing, no painterly smooth skin.
Composition: SINGLE vertical8:9 portrait, preferred1024x1152. Dark muted green flat background #1c2823. Full hair with small top margin; face and hair take upper70% and shoulders fill bottom30%, crop at upper chest with apron visible. Match atlas head scale, not a full torso shot. No text, border, frame, grid, accessories not requested, second portrait or background people.
