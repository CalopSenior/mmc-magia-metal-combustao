# Magia & Metal & Combustão — Núcleo 0.6

Jogo offline-first M.M.C., derivado do GDD: menu inicial com três saves, seletor de complexidade, campanha de contratos, regra do Resto Zero, Grande Grimório e ênfase pedagógica. A oficina livre (sandbox) continua disponível.

## Stack e limites

- React + TypeScript + Tailwind somente para shell, HUD, Códice e painéis.
- Engine imperativa própria em `src/game/`, independente do React.
- Canvas 2D com projeção ortogonal estrita em células quadradas de 64 unidades, sem perspectiva ou entidade central.
- Máquinas em matrizes numéricas locais: 16×16 para peças compactas, 32×32 para o Silo 2×2 e 48×48 para a Forja 3×3. Todas mantêm pixels de quatro unidades, preenchidos com `fillRect`; nenhum arquivo de imagem é carregado pelo motor.
- As coordenadas `q/r` e as seis portas lógicas são preservadas para compatibilidade com saves e logística. As duas conexões entre células diagonais são desenhadas e percorridas por cotovelos ortogonais.
- Mundo efetivamente infinito gerado por coordenadas e seed, com streaming de chunks de 8×8.
- Quatro biomas orgânicos — Vale do Cobre, Garganta de Ferro, Cratera de Obsidiana e Cidadela Etérea — com relevo, terrenos e distribuição própria de jazidas.
- Onze minérios do GDD com lote base, pureza, riqueza, raridade e páginas no Códice.
- Vite gera o pacote estático e o service worker de pré-cache.
- IndexedDB guarda três saves v7 validados via Zod (perfil, corrida e fábrica), migrando saves v1–v6 e oferecendo exportação/importação em JSON. A dimensão faz parte de cada estrutura, e a importação rejeita sobreposição de bases.
- Não há backend, conta, sincronização ou ranking remoto. Os saves pertencem somente ao navegador atual.
- Tauri fica para uma etapa futura; nenhuma dependência nativa é necessária agora.

## Menu, saves e complexidade

- **Menu inicial:** Jogar, Configurações (acessibilidade e ritmo) e Créditos (por enquanto só “Obrigado por jogar!”).
- **Três slots de save** independentes no IndexedDB (`slot-1…3`). Cada slot guarda perfil, Grimório, progresso da campanha e a fábrica em andamento. O save antigo (`architecture-sandbox`) é importado para o slot 1 na primeira abertura; saves v1–v6 migram para o v7.
- **Seletor de complexidade** ao criar o jogo (e no Caderno do Aluno entre contratos), alinhado ao público do GDD:

| Nível | Série | Foco | Efeito no jogo |
| --- | --- | --- | --- |
| Aprendiz | 6º–7º ano | tabuada, múltiplos, divisão com resto | dano ×0,4, dicas guiadas, Visão Matemática ligada, prova com alternativas |
| Artesão | 8º–9º ano | MMC, MDC, proporções | dano ×0,75, metas ×2 |
| Engenheiro | 1º–2º EM | fatoração, primos (11, 13), potências de 10 | dano ×1, Visão mostra a conta mas não a resposta, prova digitada |
| Mestre Etéreo | 3º EM | notação científica e escala | dano ×1,5, monstros mais rápidos, sem dicas, metas ×3 |

## Regras do GDD implementadas

- **Regra do Resto Zero** (`core/machineRules.ts`): cada entrada de uma Fornalha Devoradora, Altar ou Câmara tem um Apetite de Lote. Um lote é uma rajada de itens seguidos na esteira; quando ela termina (silêncio > 12 ticks) compara-se `quantidade ÷ lote`: resto 0 = ciclo perfeito (Éter Puro); menos que o lote = Fome de Lote (dano; o Ferro Sangrento causa o dobro); sobra = Entupimento (cristais que viram Monstros de Escória com o resto no corpo). Fome e entupimento juntos numa Câmara geram um Golem Corrompido.
- **Golem Minerador** com seletor 1–9 por batida; **Esteiras** nível 1/2/3 em 1×/2×/4× (distância ÷ velocidade para sincronizar a chegada); **Prisma** (e proporção a : b com a melhoria), **Confluência**, **Silo** (lotes de 2 a 13), **Ponte**.
- **Altares de Fusão** (9 ligas de Nível 1) e **Câmaras de Transmutação** (6 ligas de Nível 2), com receitas calculadas pelo MMC dos lotes (`content/structures.ts`). Prata Estelar usa 3 Cristais de Éter (63 + 3 = 66 = 6 × 11); o Núcleo de Dragão exige runa e Éter.
- **Cristal de Éter Bruto** é curinga: completa o valor que falta para fechar um lote.
- **Runas × 10/100/1000** gravam “Caixas Rúnicas Condensadas”: o mesmo número de itens vale 10ⁿ nas entregas (nenhum sprite extra).
- **Entreposto de Carga** (caixas de 10/50/100 levadas por um Golem Transportador entre dois canais), **Portal Modular** (só passa quantidade prima ou múltipla de 12), **Posto de Gnomos** (conserta e limpa cristais, custa Éter), **Gnomo Alquimista** (absorve 2 erros por minuto), **Torre de Dano Exato** (o Corrompido só sofre dano que divide o HP).
- **Mapas finitos por contrato** com obstáculos naturais (magma, ácido, basalto, ruínas), deposições garantidas e sementes escolhidas para ter terreno livre suficiente.
- **Grande Grimório**: 15 melhorias em 4 ramos (Forjas Geminadas, Runas, Metalurgia 2, Levitação, Prisma Ajustável, Pontes, Teleporte, Guilda dos Gnomos, Botas, Reciclagem, Engenheiro Chefe, Lente de Fluxo, Oráculo do MMC, Simulador de Pulso 4×). Pontos de Éter vêm da velocidade e das fusões perfeitas; Selos de Perfeição, só de contratos com zero resto e zero dano.
- **Campanha** (16 contratos nos 4 biomes) e **Contratos Infinitos** (desafio diário, semente livre, placar de eficiência por menor número de máquinas), liberados pelas Runas de Centena e Milhar, como no GDD.

## Ênfase educacional

- **Diário do Engenheiro:** todo erro ou acerto mostra a conta (“9 ÷ 7 = 1 resto 2”) e o que fazer.
- **Visão Matemática (M):** a equação sobre cada máquina (apetite, MMC, estoque/meta, resto da rajada em chegada). Nos níveis avançados mostra a pergunta sem a resposta.
- **Códice:** além de minérios, biomas, terrenos e ligas (com MMC, fatores primos, MDC e lotes), traz Maquinário, **8 Aulas** com exemplo resolvido e uma demonstração interativa cada, e o **Oráculo do MMC** (réguas de múltiplos sem entregar a resposta).
- **Prova da Guilda** ao fim de cada contrato (2 questões geradas pelos temas do contrato; vale Éter) e **Caderno do Aluno** com acertos por tema, aulas lidas e proporções descobertas.
- **Acessibilidade:** formas geométricas por recurso (daltonismo), texto ampliado, alto contraste, redução de animações e ritmo calmo (relógio a 60%).

## Executar

```bash
npm install
npm run dev
```

Build e verificação:

```bash
npm run test
npm run lint
npm run build
npm run preview
```

O modo offline funciona após o primeiro carregamento completo e a instalação do service worker. Em produção, o app e os assets ficam em cache; saves ficam apenas no navegador atual. Limpar os dados do site apaga cache e saves. A simulação pausa em abas ocultas e não calcula progresso offline.

## Controles

- **Mover:** arraste, use WASD/setas ou pinça/roda para controlar a câmera; o balão de inspeção fica oculto.
- **Inspecionar:** toque/clique seleciona uma célula quadrada; no mouse, o hover atualiza o balão com conteúdo, estado e descrição.
- **Construir:** abra a oficina, escolha Golem, Esteira, Fornalha, Gnomo, Prisma, Confluência, Silo ou Ponte, selecione uma das seis direções e toque/clique na célula. Construir sobre uma estrutura existente gira sua saída sem custo.
- **Demolir:** use o botão da oficina e toque/clique na estrutura. O custo, os insumos internos, a saída e todas as pistas armazenadas voltam ao inventário.
- Pinça/roda ou botões +/−: zoom entre 8% e 240% em qualquer modo. O radar entra em 38% e retorna às matrizes em 46%, com histerese para evitar oscilações.
- Enter: executa a ação do modo atual na célula central.
- Ctrl + clique: abre no Códice o minério ou terreno da célula clicada, em qualquer modo.
- Botão do balão de inspeção: equivalente touch para abrir o Códice; estruturas também podem ser giradas pelo balão. O Prisma permite escolher de 2 a 5 saídas e o Silo possui um controle de lote de 2 a 12.
- Esc: limpar seleção ou fechar o painel atual.
- Espaço: pausar/retomar.

## HUD, leitura e acessibilidade

- HUD de oficina com molduras de bronze, carvão e madeira. Marca e localização ficam no topo, a reserva tem rolagem própria e as ferramentas ficam na base. Ícones e nomes identificam os recursos sem depender apenas da cor.
- Fonte Pixelify Sans incluída localmente sob a licença OFL, também no pré-cache offline. Em **Ajustes → Acessibilidade e leitura**, é possível escolher fonte comum, texto ampliado, alto contraste e redução de animações.
- Preferências usam uma chave própria no navegador, validada e independente de saves do mundo. A primeira visita respeita as preferências de contraste e movimento do sistema; a escolha explícita do jogador prevalece.
- **G** alterna a malha entre oculta, suave e forte. O contorno usa traços claro e escuro para continuar legível sobre magma e ácido. Construção e demolição exibem a malha; o radar não recebe essa sobreposição.
- **B / I / V** escolhem construir, examinar e mover. **R** gira a saída escolhida (ou a estrutura selecionada na inspeção); **F** centraliza. Com o mapa em foco, uma mira indica onde Enter aplica a ferramenta. Foco visível, salto para o mapa e resumo de seleção apoiam navegação por teclado e leitores de tela; o canvas continua sendo uma representação espacial, sem equivalente completo em texto.
- Em paisagem com até 500 px de altura, o cabeçalho fica compacto. A oficina aparece à esquerda e a inspeção à direita, com conteúdo rolável. Em retrato, os painéis ocupam a parte inferior e mantêm a mira central livre.
- Os controles touch principais mantêm 44 px de altura; painéis com conteúdo excedente usam rolagem interna, sem aumentar a página.
- Ajustes usam um painel lateral rolável, o Códice respeita a altura disponível e as safe areas laterais são consideradas.
- O modo retrato conserva o layout vertical, sem altura mínima forçada e sem overflow da página.
- O Códice oferece navegação por setas/Home/End entre categorias e preserva a rolagem durante os ticks da simulação.
- As máquinas usam silhuetas de pedra, tijolo, tonéis e travessas de madeira com runas âmbar. O terreno tem pixels de oito unidades e faixas de cor discretas, enquanto as máquinas conservam seus planos 16×16 com pixels de quatro unidades.

## Primeira oficina mecânica

- **Golem Mineiro:** deve ser posicionado sobre uma jazida; extrai até oito unidades em seu buffer e respeita a quantidade restante do depósito. Ao esgotar a jazida — ou ao atingir o limiar individual de 5% a 90% configurado na inspeção — procura a jazida mais próxima do mesmo minério em um raio inicial de três hexágonos.
- A migração usa pathfinding, deslocamento interpolado hexágono a hexágono e reserva de rota contra novas construções. O raio está isolado em configuração para futura integração com níveis e upgrades, sem implementar a árvore nesta etapa.
- Jazidas sem Golem estacionado recuperam até 0,1 unidade/s, proporcionalmente à pureza. A recuperação é fracionária, pausa durante a extração ativa e continua quando o Golem sai em migração.
- **Esteira Rúnica:** transporta um recurso por vez por uma das seis portas lógicas. A geometria de conexões é compartilhada pela simulação, radar e animação de itens. A união dos leitos é rasterizada antes de calcular os trilhos, evitando bordas sobrepostas em curvas e junções. Os cotovelos diagonais podem pintar as margens dos blocos vizinhos, sem recortes nos cantos. Travessões e setas acompanham a direção do trecho. As transferências são calculadas em duas fases, evitando que um item atravesse várias esteiras no mesmo tick.
- **Grande Forja de Ligas:** ocupa 3×3 células e usa uma matriz 48×48 com cadinho, alvenaria, fole, duto de cobre, bigorna, bancada e runas. Recebe insumos por células diferentes de sua borda e libera ligas pelo bocal escolhido. Produz Aço Dracônico, Életron e Latão Etéreo, respeitando bloqueios de saída e progresso.
- **Gnomo Coletor:** entrega ao inventário global os recursos recebidos.
- Custos, buffers, receitas, progresso, direção, rotas em andamento, limiares de migração e quantidades fracionárias das jazidas são persistidos no save.
- A oficina desta etapa aceita no máximo 256 estruturas. A cadeia básica é: Golem sobre jazida → Esteiras → Fornalha ou Gnomo.

## Tamanhos e construção

- A Forja ocupa 3×3 células, o Silo ocupa 2×2 e as demais peças usam 1×1. O clique define o canto superior esquerdo; o tamanho aparece na bancada e a prévia mostra a base, a disponibilidade da área e o bocal de saída.
- A base inteira bloqueia novas construções e caminhos de Golem. Seleção, giro, configuração e demolição funcionam ao clicar em qualquer célula da máquina; custo e conteúdo são devolvidos uma única vez.
- Saves antigos ampliam máquinas quando a nova área está livre, sem rotas reservadas e sem deslocar uma saída conectada. Em fábricas densas, a versão compacta é mantida. **Ampliar** na inspeção permite fazer a expansão depois de liberar a área e desconectar a saída.
- As entradas da Forja e do Silo aceitam esteiras que terminem em suas bordas. Bocais visíveis indicam o encaixe das esteiras; a saída ocupa uma célula da borda escolhida, e as duas direções diagonais usam os cantos correspondentes. O radar mostra o tamanho real das bases.

## Logística rúnica

- **Prisma Divisor:** recebe somente pela retaguarda e divide lotes exatos entre 2, 3, 4 ou 5 saídas configuráveis na inspeção. Cada pista recebe a mesma quantidade; o resto permanece nos insumos até completar outra divisão. Reduzir o número de saídas devolve os recursos das pistas removidas aos insumos. Capacidade de entrada: 60 unidades.
- **Confluência Rúnica:** aceita duas entradas traseiras simultâneas e soma os fluxos em uma saída. Recursos diferentes não se misturam no mesmo buffer; a saída comporta até 64 unidades.
- **Silo de Amortecimento:** ocupa 2×2 células, armazena até 120 unidades e libera somente múltiplos completos do lote configurado entre 2 e 12. O resto fica retido e a saída bloqueada impede uma nova liberação.
- **Ponte de Fluxo:** cruza duas esteiras retas em níveis independentes. Cada pista possui entrada, saída e buffer próprios; as reservas por célula e pista permitem entradas simultâneas sem misturar recursos.
- As configurações do Prisma e do Silo, os lotes retidos e os recursos das pistas são persistidos no save v6. A demolição devolve todo o conteúdo ao inventário.

## Mundo e desempenho

- A distância de geração é configurável de 1 a 4 chunks ao redor da célula central da câmera.
- O cache fica entre 9 chunks/576 células e 81 chunks/5.184 células.
- Biomas são regiões Voronoi com distorção por ruído e atravessam fronteiras de chunks.
- Novos mapas usam **distritos de mineração**: cada chunk de 8×8 contém no máximo um tipo de minério natural, em um bolsão compacto com contorno distorcido por ruído. Grupos de 2×2 chunks compartilham o material predominante, escolhido pelos pesos do bioma do distrito. Os quatro distritos junto à origem garantem Cobre, Carvão, Ferro e Quartzo para iniciar a Oficina. O espaço entre os bolsões fica livre de jazidas para organizar a logística; a formação não depende da ordem de streaming.
- O save v7 registra opcionalmente `oreLayout`. Novos saves e novos mapas usam `veins`; saves anteriores sem esse campo continuam em `legacy`, preservando posições, identidades e quantidades das jazidas já exploradas. Novos contratos mantêm as jazidas solicitadas pelo planejador de objetivos; as áreas naturais ao redor usam distritos. Iniciar outro mapa ou regenerar a Oficina livre ativa a distribuição nova.
- Relevo e biomas usam ruído fractal em camadas e distorção de domínio. Os campos de altura, umidade, calor e fratura são interpolados em coordenadas absolutas, compartilhando amostras entre bordas de chunks.
- Encostas recebem luz direcional calculada pelo gradiente de altura. Luminosidade quantizada e curvas de nível representam terraços e vales diretamente nas cores, sem deslocamento de perspectiva.
- A arte interpola pesos entre regiões antes de calcular calor, relevo e cores, eliminando os cortes abruptos nas fronteiras dos biomas. Campos comuns de ruído são calculados uma única vez por amostra. A classificação lógica das células e a distribuição das jazidas continuam determinísticas e preservam os contratos e saves; a faixa visual de mistura pode atravessar a borda lógica de uma célula.
- O renderizador aplica culling por viewport e DPR limitado a 2.
- A cena é composta em um buffer numérico rasterizado em Canvas e apresentada com uma única cópia por frame. O canvas visível não usa apresentação dessincronizada: terreno, esteiras e máscara fora do contrato chegam juntos, evitando flashes do exterior durante hover ou ticks a 0,40×. O buffer custa uma superfície adicional do tamanho da viewport, liberada ao encerrar a engine; o cache de terreno não é regenerado por hover ou passagem de ticks.
- Terreno detalhado usa matrizes `Uint32Array` de 64×64 cores por bloco de 8×8 células. A iluminação e os líquidos usam faixas de cor reduzidas, com pontilhado esparso. Um canvas auxiliar guarda apenas o raster dessas cores, composto por `drawImage`, sem decodificar ou carregar imagens externas.
- Radar usa blocos de 32×32 células amostrados em apenas 16×16 cores, sem iluminação, textura ou decorações. Máquinas viram nós quadrados e conexões reais viram linhas sólidas coloridas. Matrizes, partículas e etiquetas locais são descartadas.
- Cache LRU limitado a 4 milhões de pixels (aproximadamente 32 MB somando cores numéricas e rasters RGBA); geração visual limitada a três blocos detalhados ou oito blocos de radar por frame. Metadados de células visíveis também têm limite de 8.192 entradas.
- O terreno cobre toda a viewport independentemente da distância configurada para streaming da simulação. Zoom distante não gera nem retém milhares de chunks de simulação.
- Amostragem nearest-neighbor e preenchimentos de matrizes alinhados a pixels mantêm o desenho nítido. Seleção, hover e coordenadas são overlays ortogonais; frames estáticos reutilizam o desenho anterior.
- A simulação usa fixed timestep de 50 ms e velocidades 1×, 2× e 4×.

## Estrutura da engine

- `content/`: definições e textos de biomas, terrenos, minérios, ligas, estruturas e Códice.
- `world/biomeField.ts`: regiões de biomas com distorção por ruído.
- `world/topography.ts`: campos contínuos, interpolação, sombreamento e paleta numérica do terreno.
- `world/generation.ts`: células e depósitos determinísticos, com inspeção coerente com a superfície.
- `world/ChunkWorld.ts`: streaming, cache e poda de chunks.
- `core/engine.ts`: ciclo de vida, fixed timestep, foco, autosave e hooks de verificação.
- `core/simulation.ts`: extração, pathfinding e migração dos Golens, recuperação de jazidas, logística simultânea, fundição, coleta e inventário.
- `core/input.ts`: Pointer Events, touch, mouse, Ctrl + clique e teclado.
- `core/renderer.ts`: Canvas 2D, cache de matrizes de terreno, culling e overlays dinâmicos.
- `core/structureRenderer.ts`: matrizes animadas das estruturas e diagrama de fluxos do radar.
- `core/structureGeometry.ts`: bases multicélula, bocais, conexões e polilinhas ortogonais compartilhadas.
- `core/beltRenderer.ts`: união de leitos e rasterização de trilhos com cache por topologia e fase de animação.
- `core/lod.ts`: limiares e histerese de representação.
- `content/pixelMatrices.ts`: planos numéricos das máquinas e rasterizador por paleta.
- `math/grid.ts`: projeção quadrada, seleção e percurso ortogonal dos fluxos.
- `core/camera.ts`: pan e zoom ancorado.
- `math/hex.ts`: conversões axial/pixel, arredondamento cúbico e distâncias.
- `persistence/`: IndexedDB, migração e schema versionado do save.

## Verificação visual

Com `npm run dev`, abra `/verification/visual-qa.html` para comparar a mesma fábrica em matrizes e radar. A página cria seu próprio estado em memória e não acessa IndexedDB nem altera saves. A suíte inclui projeção e seleção negativas, zoom ancorado, percursos ortogonais, histerese, redução de chamadas no radar, cobertura além dos chunks residentes, bordas contínuas e persistência do zoom mínimo.

`/verification/usability-qa.html` reúne os componentes reais do HUD, contrato, diário e Códice sobre uma fábrica isolada, para conferir retrato, paisagem e monitores pequenos sem alterar partidas. As preferências de expansão da Reserva ainda são salvas no navegador.

## Interação e acessibilidade

- Os canais de **Entrepostos e Portais** são sequências ordenadas de três cores, escolhidas numa paleta de doze. As cores podem repetir: são 1.728 canais distintos, sem codificação por produtos de primos. A paleta tem nomes, siglas, contraste e navegação por teclado; o mapa mostra os três selos de cor na ordem do canal. Canais numéricos antigos são convertidos automaticamente, preservando seus pares. `content/channels.ts` centraliza o catálogo de cores, que pode crescer sem alterar os IDs já salvos. Alterar o canal afeta as próximas viagens, preservando as remessas já em trânsito.
- Os dez retratos dos créditos seguem a direção de arte de artífices do M.M.C., com couro, aventais, ferragens e contornos definidos. Todos usam matrizes de 128×144 e até 35 cores, exibidas em escala inteira 1:1, sem carregar imagens no jogo. As fontes atuais são selecionadas por `verification/art/credit-portrait-sources.json`: Dani foi refeita com as novas fotografias (`daniela-artificer-v5.png`); Marília foi gerada novamente pelas fotografias frontais, com sorriso discreto e figurino inspirado na pixel art do usuário (`marilia-photo-likeness-v7.png`). O prompt dessa revisão está em `verification/art/marilia-photo-likeness-v7-prompt.md`; o de Dani em `verification/art/portraits-v5-prompts.md`. Os demais oito retratos permanecem nas fontes anteriores. `node scripts/compile-credit-portraits.mjs` recompila as fontes para `content/portraitData.generated.ts`.
- `/verification/channels-qa.html` testa os seletores reais e o transporte entre duas sequências; `/verification/portraits-qa.html` mostra os sete retratos ampliados.

- O transportador completa **ida carregada → descarga → volta vazia**. A volta dura o mesmo tempo da caminhada de ida e mantém a criatura visível, orientada para a origem, sem caixas nem indicador de minério. Os seis transportadores disponíveis de cada Entreposto continuam ocupados durante o retorno; só podem iniciar outra viagem ao chegar à origem. A aceitação da carga fica marcada em `deliveredAt`, um campo opcional compatível com saves anteriores. Isso preserva a volta ao reabrir a partida e impede entregar a mesma caixa duas vezes. No radar, a volta usa um nó vazado.

- **Criaturas** e **Maquinário** têm seções distintas no Códice e na Oficina. Golens e Gnomos pertencem às criaturas; Entrepostos, Postos e demais construções ficam no maquinário. Links antigos continuam abrindo a seção correta. O Transportador possui ficha própria, mas é convocado automaticamente pelos Entrepostos.
- O **Golem Transportador** usa matrizes de 40×48 com pedra facetada, musgo, runas e caixas de madeira. Mede 120×144 unidades visuais, diante de um minerador de 64×64. As poses mostram coleta, passos alternados, espera carregada e descarga; o selo da caixa e o número indicam o recurso e a quantidade reais. Caixas de 10, 50 e 100 alteram a carga visível.
- A coleta ocupa o segundo de preparação já previsto no transporte. A descarga começa somente quando a simulação aceita a remessa; destino cheio mantém o colosso segurando as caixas. A apresentação não altera os estoques, os tempos de entrega ou o schema dos saves. Pausar congela as poses, reduzir movimento elimina o balanço e os passos, e o radar usa apenas um nó sólido por remessa. O minerador mantém pixels de quatro unidades, rosto e corpo de pedra, picareta animada e seis posturas, sem visor nem bocal mecânico.
- `/verification/carrier-qa.html` compara a escala e as poses dos dois golens e executa uma linha real entre Entrepostos. Permite bloquear o destino, pausar, alternar radar, direções e tamanho das caixas sem acessar saves.

- O menu principal oferece **Códice** e **Como jogar** antes de entrar em uma partida. O guia tem quatro capítulos e demonstrações guiadas; também pode ser aberto pelo menu da fábrica. Ao criar um mundo, escolha **Campanha**, que começa no primeiro contrato, ou **Oficina livre**, com todas as máquinas disponíveis.
- As páginas de minérios e ligas ligam ingredientes, receitas, estruturas de produção e custos de construção. O histórico do Códice permite voltar ao recurso de origem. As demonstrações mostram entradas, quantidades, quatro etapas, saídas e falhas concretas; Fornalha, Prisma, Torre e Portal oferecem casos comparáveis. Reprodução e avanço manual não alteram a partida.
- As orientações usam rotações inteiras de 90 graus e bocais diagonais desenhados como cotovelos, sem reamostrar ou achatar as matrizes. Golens e gnomos mantêm a postura e mudam rosto, braço e carga conforme a direção.
- O **quarto slot**, Cidadela Pibid de Matemática, é uma exposição virtual protegida, montada como a megabase de um jogador que aproveita tudo o que o jogo ensina. Cada distrito leva o nome do conteúdo que mostra: a Praça da Origem (plano cartesiano), a Avenida das Tabuadas (lotes de 2 a 13), o Bairro do MMC (as nove ligas), o Quarteirão da Fatoração (Nível 2), o Barramento das Proporções (três linhas de minério, Silos e Prismas dividindo 6 ÷ 3, 9 ÷ 3 e 12 ÷ 3), a Estação dos Primos (portal modular), os Campos da Conservação (Pontos de Coleta, golems caminhando e Energizadores com doses de 1 a 5) e a Galeria das Obras-Primas.
- O **Reator Recursivo** fecha o laço da Mesa de Alquimia: a raiz da árvore do Núcleo de Dragão forja 360 núcleos com Runa ×10, um Prisma os desfaz em unidades e uma árvore binária de Prismas (50 % + 50 %, depois 25 %…) os distribui a oito Mesas dentro da própria árvore, que devolvem 18 minérios por Núcleo para as fornalhas, e a mais oito Mesas do **Pomar**, cujo excedente vai direto aos Gnomos. Uma terceira saída do Prisma exporta o excedente de Núcleos.
- A exposição usa a mesma simulação estrita da campanha, com depósitos duradouros e uma pequena carga inicial de comissionamento; seus produtos não são injetados durante a execução. A primeira visita prepara 3.600 ticks em memória. Novas visitas restauram esse estado, e gravação, exclusão, importação, construção e configuração das máquinas são bloqueadas no quarto slot. Os três saves pessoais continuam independentes. A suíte verifica conexões e executa 8.000 ticks, exigindo produção de todas as ligas sem fome, entupimento ou dano.

- **Reserva** recolhe e expande o inventário; a escolha fica salva neste navegador. **Contrato** e **Diário** também podem ser recolhidos. Em celular paisagem, começam compactos; no retrato, acompanham a altura dos outros painéis sem se sobrepor.
- **Mover** seleciona estruturas com um toque curto e move a câmera ao arrastar. Clicar em qualquer célula de uma máquina grande seleciona a estrutura inteira.
- **Ação** abre uma lista vertical navegável por teclado com Mover, Examinar, Construir, Girar, Copiar e Recolher. Copiar escolhe o mesmo tipo, orientação e nível de esteira; não duplica conteúdos ou melhorias.
- **R** gira a peça em construção; **Shift + R** volta uma direção. As seis orientações mudam o corpo numérico, o bocal e a prévia; não dependem somente da seta. Na inspeção ou em Mover com uma estrutura selecionada, R gira essa estrutura.
- Arrastar no mapa com uma esteira escolhida desenha um trajeto com prévia. Saltos do ponteiro são preenchidos por vizinhos ortogonais; curvas ajustam as saídas automaticamente. Pode-se iniciar em um bocal de máquina e terminar em outra máquina. Pinça, cancelamento e troca de ferramenta cancelam o desenho. O trecho inteiro é validado antes de gastar materiais ou alterar as estruturas existentes.
- O Códice mostra miniaturas numéricas, uma ilustração maior girável do maquinário e demonstrações em Canvas, sem arquivos de vídeo. A reprodução começa pausada e tem controles de reproduzir, pausar e reiniciar; trocar de página encerra a animação anterior. As aulas mantêm seus exemplos matemáticos interativos.
- Os onze minérios possuem silhuetas próprias. As ligas usam seis famílias de formas — lingote, chapa, bobina, lasca, frasco e núcleo — com paletas e marcas. `content/resourceSprites.ts` fornece a mesma arte para jazidas, itens em movimento, Reserva, custos, objetivos, inspeção e Códice. Os ícones aleatórios de recursos em SVG foram substituídos por essas matrizes.
- Todas as máquinas têm instruções operacionais no Códice: para que servem, entradas, saídas, montagem, exemplo e consequências dos erros. A Fornalha explica explicitamente que valida e devolve o mesmo minério, conta ciclos perfeitos e gera Éter; quem transforma materiais em ligas é o Altar de Fusão ou a Câmara.

`/verification/resources-qa.html` apresenta o catálogo visual, a distribuição natural por distritos e um teste contínuo de contrato a 0,40× com ticks, esteiras e cursor. O indicador acompanha um pixel externo amostrado após frames completos; a suíte também verifica que o canvas visível recebe apenas a composição final, sem repintura direta do terreno ou da máscara.
