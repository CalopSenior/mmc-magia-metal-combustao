import type { StructureType } from '../types'

export interface MachineGuide {
  purpose:string
  input:string
  output:string
  setup:string
  example:string
  failure:string
}

/** Player-facing operational descriptions, kept separate from flavor and recipes. */
export const MACHINE_GUIDES:Record<StructureType,MachineGuide>={
  golem:{
    purpose:'Extrai minérios do chão. É o início de uma linha de produção; sem ele, uma jazida não alimenta esteiras.',
    input:'Uma jazida sob o Golem. O tamanho do lote é configurável de 1 a 9 unidades.',
    output:'O mesmo minério da jazida, em lotes, entregue à esteira no lado indicado pela postura e pela picareta.',
    setup:'Convoque sobre o minério, vire o Golem para a primeira esteira e escolha um lote compatível com o próximo receptor.',
    example:'Golem sobre Cobre, lote 2 → esteira → Fornalha com apetite 2. Cada chegada de 2 fecha um lote exato.',
    failure:'Sem jazida ou com saída cheia, não extrai. Quando o minério diminui, pode migrar para outra jazida do mesmo tipo; ajuste o limite de migração na inspeção.',
  },
  conveyor:{
    purpose:'Leva recursos de uma máquina para outra, preservando o material e a quantidade. Use curvas para organizar as linhas.',
    input:'O bocal de saída de uma máquina ou o fim de outra esteira.',
    output:'O mesmo recurso para a próxima célula, no sentido dos trilhos.',
    setup:'Escolha Esteira na Oficina e arraste no mapa. Termine numa entrada compatível; R muda a direção da peça antes de colocá-la.',
    example:'Golem → esteiras → Silo → Fornalha. Níveis maiores transportam mais rápido, mas não mudam a receita.',
    failure:'Sem receptor, com uma entrada incompatível ou com a próxima saída cheia, o fluxo para. Esteiras comuns não atravessam líquidos nos contratos.',
  },
  smelter:{
    purpose:'Confere se o minério chega em lotes completos. Use para cumprir entregas de minério e metas de ciclos perfeitos; ela não transforma cobre em ferro nem fabrica ligas.',
    input:'Um único tipo de minério por vez, enviado em remessas. Apetite de Lote configurável de 2 a 9.',
    output:'O mesmo minério, na quantidade que completou lotes. Cada ciclo exato conta para a meta; a cada 4 ciclos perfeitos, rende 1 Ponto de Éter na campanha.',
    setup:'Ligue Golem → esteira → Fornalha → esteira → Gnomo. Na inspeção, combine o lote do Golem com o apetite da Fornalha. A remessa é avaliada após uma pausa nas chegadas.',
    example:'Apetite 3: chegam 6 de Cobre → 6 ÷ 3 = 2 lotes, resto 0 → saem os mesmos 6 de Cobre. Não são consumidos como combustível.',
    failure:'Chegam 2 com apetite 3: fome, dano e nenhuma saída desse lote. Chegam 7: saem 6, sobra 1 cristalizado na entrada. Acúmulo de cristais pode gerar monstros. Ajuste a alimentação antes de reparar.',
  },
  furnace:{
    purpose:'Fabrica ligas a partir de dois minérios. Use quando a meta pede uma liga ou quando você precisa de materiais mais avançados.',
    input:'Os materiais e as quantidades da receita selecionada. Cada entrada precisa respeitar seu apetite de lote.',
    output:'Uma liga nova; os minérios da receita são consumidos na fusão.',
    setup:'Reserve a base 3×3, selecione a liga na inspeção e conecte linhas separadas para os dois ingredientes. Ligue o bocal de saída ao destino da liga.',
    example:'Bronze Rúnico: sincronize os lotes de Cobre e Carvão mostrados na receita. O Códice da liga mostra as quantidades e o cálculo do MMC.',
    failure:'Se falta um ingrediente, a fusão espera. Remessas menores ou com resto causam fome ou cristalização; saída cheia impede escoar a liga. Não confunda com a Fornalha, que devolve o mesmo minério.',
  },
  gnome:{
    purpose:'Recolhe a produção para a Reserva. Em contratos, o que ele coleta também conta para a entrega pedida.',
    input:'Recursos enviados por uma esteira ou máquina adjacente.',
    output:'Recursos na Reserva e progresso da entrega; não possui uma esteira de saída.',
    setup:'Coloque no fim da linha. Aponte a última esteira para a célula do Gnomo.',
    example:'Fornalha devolve 6 de Cobre → esteira → Gnomo → Reserva recebe 6 e a meta de Cobre avança.',
    failure:'Se a esteira aponta para outro lugar, nada é coletado. Um Gnomo no chão, sem fluxo de entrada, não minera.',
  },
  prism:{
    purpose:'Divide um lote em partes iguais para alimentar várias linhas com a mesma quantidade.',
    input:'Uma linha conectada pela retaguarda do Prisma.',
    output:'De 2 a 5 saídas com parcelas iguais do mesmo recurso.',
    setup:'Escolha o número de saídas na inspeção e conecte as pistas indicadas. Envie um lote divisível por esse número.',
    example:'12 unidades em 3 saídas → 4 para cada linha. Útil para alimentar três máquinas em paralelo.',
    failure:'Restos ficam retidos até completar outra divisão. Uma pista bloqueada pode impedir a distribuição; conectar pela frente não é uma entrada válida.',
  },
  confluence:{
    purpose:'Soma duas linhas num único fluxo. Use para reunir lotes pequenos antes de alimentar uma máquina.',
    input:'Duas pistas traseiras; organize o mesmo material para somar os lotes.',
    output:'Uma linha com os lotes reunidos, sem criar um novo material.',
    setup:'Aponte a saída para o destino e ligue as duas entradas da retaguarda.',
    example:'Uma linha envia 4 de Cobre e outra 5 → fluxo reunido de 9. Ajuste o ritmo para que as remessas cheguem juntas.',
    failure:'Materiais diferentes não viram liga aqui e não são misturados no mesmo buffer. Para fundir, use o Altar de Fusão.',
  },
  silo:{
    purpose:'Acumula unidades e libera apenas lotes do tamanho escolhido. Use para estabilizar a alimentação e montar lotes grandes.',
    input:'Minério ou liga trazido por esteiras; capacidade total de 120 unidades.',
    output:'Múltiplos completos do lote configurado, de 2 a 13. O resto permanece guardado.',
    setup:'Reserve 2×2 células, coloque entre extração e processamento, escolha o lote e conecte a saída.',
    example:'Silo ajustado para 11: com 10 unidades, espera; com 12, pode liberar 11 e guardar 1.',
    failure:'Com menos de um lote ou saída bloqueada, não libera. O estoque retido não foi perdido; ele espera completar o próximo lote.',
  },
  bridge:{
    purpose:'Cruza duas linhas sem juntar os materiais. Use para evitar desvios e misturas em fábricas densas.',
    input:'Duas entradas independentes, uma para cada pista.',
    output:'Duas saídas independentes; cada material segue sua própria pista.',
    setup:'Gire a ponte para alinhar as pistas e conecte cada entrada à saída correspondente.',
    example:'Cobre cruza uma linha de Carvão; os dois continuam separados. O cruzamento não produz Bronze.',
    failure:'Uma pista conectada pelo lado errado não recebe. A ponte depende da melhoria de Mithril; a pista elevada pode cruzar líquidos.',
  },
  chamber:{
    purpose:'Produz ligas de Nível 2 para as metas e tecnologias avançadas.',
    input:'Ligas e catalisadores da receita. Algumas receitas exigem Runas e Pontos de Éter.',
    output:'A liga avançada escolhida, consumindo os ingredientes da receita.',
    setup:'Reserve 3×3, escolha a receita, organize as linhas de cada ingrediente e confira catalisador, Runa mínima e custo no Códice da liga.',
    example:'Aço Etéreo combina Aço Cinzento e Latão Ressonante. Veja os lotes e o MMC na página do Aço Etéreo.',
    failure:'Sem Éter, Runa ou ingredientes suficientes, espera. Fome e sobras simultâneas podem criar um Golem Corrompido; corrija os lotes antes de retomar.',
  },
  tower:{
    purpose:'Defende a fábrica dos monstros gerados por erros de produção. O dano pode ser ajustado para acertar divisores exatos.',
    input:'Um alvo no alcance de 5 células; dano configurável de 1 a 12.',
    output:'Dano ao monstro, sem consumir um minério pela entrada.',
    setup:'Coloque perto das máquinas expostas e escolha na inspeção um dano que divida o HP do Golem Corrompido.',
    example:'HP 12 e dano 4 → 3 golpes. HP 12 e dano 5 → ricochete no Golem Corrompido.',
    failure:'Fora do alcance não atira. Dano que deixa resto não fere o Golem Corrompido; escolha outro valor.',
  },
  gnomepost:{
    purpose:'Mantém a fábrica funcionando: um Gnomo Operário repara estruturas e limpa cristais próximos.',
    input:'Pontos de Éter e uma máquina próxima precisando de serviço.',
    output:'Durabilidade recuperada e entradas limpas; não fabrica recursos.',
    setup:'Instale junto ao setor de processamento e mantenha uma reserva de Éter para os serviços.',
    example:'Uma Fornalha acumula cristais por um lote errado; o operário ajuda a limpar depois que você corrige a alimentação.',
    failure:'Sem Éter ou fora do alcance, o serviço não acontece. Reparar não resolve a causa de um lote incorreto.',
  },
  depot:{
    purpose:'Transporta carga entre setores distantes, atravessando obstáculos sem uma longa esteira contínua.',
    input:'Um lote que complete uma caixa de 10, 50 ou 100 unidades.',
    output:'A carga chega ao Entreposto do mesmo canal após o tempo de viagem.',
    setup:'Construa dois Entrepostos e escolha três cores na mesma ordem em ambos. Configure o tamanho de caixa; conecte a alimentação no primeiro e a retirada no segundo. As cores podem se repetir.',
    example:'Branco → Cinza → Preto nos dois Entrepostos, caixa 10: junte 10 de Ferro e envie ao parceiro. Branco → Preto → Cinza identifica outro canal.',
    failure:'Sem parceiro, sem caixa completa ou com destino cheio, a carga espera. A viagem não é instantânea.',
  },
  portal:{
    purpose:'Teleporta lotes elegíveis entre dois pontos, eliminando o tempo de viagem de uma linha longa.',
    input:'Uma quantidade prima ou múltipla de 12, após encerrar a remessa.',
    output:'O mesmo material no Portal parceiro do mesmo canal, instantaneamente.',
    setup:'Escolha as mesmas três cores, na mesma ordem, nos dois Portais. As cores podem repetir. Use um Silo para preparar o tamanho do lote.',
    example:'11 é primo: passa. 24 é múltiplo de 12: passa. 10 não satisfaz nenhuma regra: fica retido.',
    failure:'Lote inválido, parceiro ausente ou saída do parceiro cheia impede a transferência; o material fica guardado.',
  },
  collector:{
    purpose:'Guarda o que um Golem Minerador carrega no momento em que ele troca de jazida, para que nada se perca na mudança.',
    input:'A carga de qualquer Golem a até 9 células (em linha reta, nos dois eixos) que acabou de decidir migrar.',
    output:'O minério guardado, em remessas de até 18 unidades, para a esteira ligada ao bocal.',
    setup:'Construa perto da jazida, ligue o bocal a uma esteira e deixe os Golems da região com o limite de migração ligado. Use um Silo depois dele se a máquina seguinte exige lotes exatos.',
    example:'Um Golem leva 7 de Cobre e a jazida acaba: ele deixa os 7 no Ponto e segue para a próxima. 7 + 5 de outro golem = 12 de estoque, soltos aos poucos na esteira.',
    failure:'Com o depósito cheio (300) o golem leva a carga consigo. A remessa de 18 não respeita lotes: para uma Fornalha de lote 4, passe antes por um Silo.',
  },
  alchemy:{
    purpose:'Multiplica um minério: queima um Núcleo de Dragão e devolve os minérios básicos que ele custou, mais um bônus.',
    input:'Núcleos de Dragão e um minério (a semente), um tipo por vez. Cada ciclo gasta 1 Núcleo e 1 unidade da semente.',
    output:'18 unidades do minério-semente por ciclo: 8 (a soma dos minérios básicos de um Núcleo) + 10 de bônus.',
    setup:'Ligue duas esteiras: uma com Núcleos de Dragão e outra com o minério que você quer multiplicar. Ligue o bocal ao destino.',
    example:'Núcleo de Dragão = Aço Etéreo (4 minérios) + Adamantina Dorsal (4 minérios) = 8. Com semente de Cobre: 1 Núcleo + 1 Cobre → 18 Cobre.',
    failure:'Sem Núcleo ou sem semente, parada. Se o minério muda no meio, a mesa termina o ciclo e só então aceita o novo tipo. Saída cheia trava o ciclo.',
  },
  energizer:{
    purpose:'Acelera a restauração de todas as jazidas num raio de 36 células, queimando Latão Ressonante.',
    input:'Latão Ressonante. A dose (1 a 5) é quantas unidades são gastas por ciclo de um minuto.',
    output:'Nenhum recurso. Jazidas no raio se restauram (1 + dose) vezes mais rápido: dose 1 dobra, dose 3 quadruplica.',
    setup:'Coloque no meio da região das jazidas e leve Latão Ressonante por esteira. Escolha a dose na inspeção e veja o círculo do alcance.',
    example:'Dose 2 gasta 2 Latão por minuto e deixa as jazidas se restaurando 3 vezes mais rápido que o normal (0,1 → 0,3 por segundo, no máximo).',
    failure:'Sem Latão no começo de um ciclo o bônus acaba. Jazidas sendo minadas não se restauram, com ou sem Energizador. Máquina quebrada não energiza.',
  },
  grandaltar:{
    purpose:'Funde várias ligas de Nível 1 ao mesmo tempo e entrega o dobro de cada fusão.',
    input:'Os minérios e ligas das receitas de Nível 1, em lotes exatos como num Altar comum. Até 3 fusões em andamento.',
    output:'Cada fusão rende o dobro da receita. Os produtos saem um tipo por vez pelo bocal.',
    setup:'Só pode ser erguido com as 25 células sobre Fenda de Magma. Alimente com várias esteiras; escolha uma receita na inspeção para fixá-la, ou deixe automático.',
    example:'Cobre + Carvão e Carvão + Ferro chegando juntos: duas fusões em paralelo. Bronze Rúnico rende 2 × 6 = 12 por fusão.',
    failure:'Terreno sem magma impede a construção. Lotes errados causam fome ou entupimento como em qualquer Altar. Com os produtos acumulados e a saída parada, as fusões esperam.',
  },
  paving:{
    purpose:'Decoração para organizar a oficina em alas e caminhos.',
    input:'Nenhuma: o piso não recebe nem entrega recursos.',
    output:'Nenhum recurso: é só decoração para a oficina.',
    setup:'Escolha o acabamento (Pedra, Laje rúnica ou Mosaico de latão) e toque no chão. Construir outra peça sobre um piso o substitui.',
    example:'Uma faixa de lajes entre a mina e a fornalha marca a rota; um mosaico de latão destaca a ala das Obras-Primas.',
    failure:'Não há falhas: pisos não quebram, os monstros os ignoram e eles não contam no limite de máquinas (há um limite à parte para decoração).',
  },
  lantern:{
    purpose:'Decoração: marca caminhos e cantos com uma chama de mana.',
    input:'Nenhuma: a lanterna não recebe recursos de ninguém.',
    output:'Luz e atmosfera, só para enfeitar o chão da oficina.',
    setup:'Coloque em uma célula livre ou sobre um piso.',
    example:'Uma lanterna a cada 4 células ao longo de uma esteira mostra de relance o comprimento dela.',
    failure:'Não há falhas: não quebra e os monstros a ignoram.',
  },
}
