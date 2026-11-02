# Marília — nova geração pelas fotografias

Gerado com a ferramenta integrada `imagegen`. Fonte selecionada: `marilia-photo-likeness-v7.png`. Esta revisão reconstrói o rosto a partir das fotografias; a ilustração enviada pelo usuário orienta o figurino, e o atlas orienta o acabamento. A expressão usa boca fechada e sorriso discreto.

Referências na ordem usada:

1. `codex-clipboard-24c95240-5704-438c-a1f7-de4176504a9e.png`: fotografia frontal neutra, geometria do rosto.
2. `codex-clipboard-b7eb03ed-05f3-479c-8b68-4b3e4554bbd7.png`: fotografia frontal com cabelo solto.
3. `codex-clipboard-c2bce1ca-d860-46c5-9a4a-e7cfa1279bb5.png`: fotografia sorrindo.
4. `codex-clipboard-7ebc4b0b-cf49-4326-949a-e0e9def17d28.png`: conceito de figurino do usuário.
5. `credits-artificers-atlas.png`: estilo de renderização dos demais.

O manifesto aplica recorte normalizado (x=0,05; y=0; largura=0,9; altura=0,9) para enquadrar o rosto na escala do conjunto. Somente a matriz de Marília é substituída; as outras nove permanecem idênticas. O jogo desenha a matriz numérica 128×144, com até 35 cores, sem carregar PNGs.

## Prompt final

Use case: identity-preserve / style-transfer.
Create ONE entirely new portrait of MARILIA from the real photographs, for the M.M.C. game credits. Facial likeness to the real woman is the first priority. Do not reuse the face of any previous generated portrait.

REFERENCES AND PRIORITIES:
Image1 = the clearest frontal neutral photograph of the real Marilia, hair pulled back. AUTHORITATIVE face geometry: use it to understand actual jaw/cheek shape, brow placement, eyelids, nose and lips without hair hiding the contours.
Image2 = real Marilia with center-parted dark hair and closed lips, another frontal geometry reference.
Image3 = real Marilia smiling; same woman. Use to understand her natural expression, not as a mandate for a large toothy grin.
Image4 = user's new pixel-art concept: costume reference ONLY (brown high-collared leather coat, copper goggles resting on head, canvas apron, two small blue-violet crystals on apron straps). Its face is not yet a successful likeness, so do NOT trace that face or its huge eyes/narrow chin.
Image5 = existing credits atlas: AUTHORITATIVE RENDERING STYLE and framing only. Never copy a face from it. Ignore its previous Marilia cell at row2col3.

IDENTITY / EXPRESSION:
Carefully reconstruct the same person shown in images1–3. Preserve her naturally full oval face and softly rounded chin/jaw, natural cheek volume without slimming, gently arched moderately thick brows, real relatively narrow/relaxed almond eyes and their spacing, natural nose with a rounded broader base and subtle bridge, actual full upper/lower lip contours and mouth width. Use a calm closed-mouth slight smile with direct eye contact, closer to image2, instead of the generic huge toothy smile of previous attempts. Not pursed exaggerated lips. Keep her actual proportions and subtle asymmetry. No beautification, sculpted model jaw, tiny button nose, giant glassy eyes, thick mascara, glossy lipstick or generic fantasy heroine face.
Hair: very dark brown near-black, center-parted smooth crown and long loose gently wavy hair over shoulders. Realistic hair mass, not a huge halo of corkscrew curls.

COSTUME: island-owning master artificer: weathered brown leather high collar, copper/brass clasps and small rivets, canvas apron with brown straps, modest copper goggles resting above forehead, two SMALL pale blue/violet crystal pins on straps as image4. No giant central neon jewel. Keep face unobstructed.

STYLE: exactly the naturalistic finely shaded pixel art of image5: delicate stepped face shading and restrained skin texture, clustered pixel strands, dark selective contours, earthy controlled palette, amber key light and subtle blue rim highlights. Anatomically natural faces with crisp pixels, not anime/cartoon avatars or photos. Same detail density and contour thickness as the atlas's other nine people.

COMPOSITION: SINGLE head-and-shoulders portrait, vertical8:9, preferred1024x1152. Match atlas head scale: top of hair/goggles around5% from top, chin around70% from top, only upper chest/apron at bottom. Do not zoom out to a whole torso. Mostly frontal/slight three-quarter, both eyes visible looking at viewer. Uniform flat dark muted green #1c2823 background. No white background, frames, text, grid, other people, phones or video call UI.
The output must be recognizable as the same real woman in photos1–3 while looking like the same artist produced her alongside the other nine in image5.
