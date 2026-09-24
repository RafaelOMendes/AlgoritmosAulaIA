# Explicação do projeto: Minimax na Fuga no Labirinto (estilo Tron)

## 1. O problema

Um labirinto quadrado tem paredes espalhadas aleatoriamente. Dois agentes, **Azul** e **Laranja**, começam em lados
opostos e a cada rodada **os dois andam uma célula ao mesmo tempo** (cima, direita, baixo ou esquerda), deixando um
**rastro sólido** para trás, como as motos de luz do filme Tron. Um agente perde quando:

- bate em uma parede ou sai do tabuleiro;
- bate no próprio rastro ou no rastro do oponente;
- entra na mesma célula que o oponente na mesma rodada (colisão frontal: os dois perdem e dá **empate**).

Não existe "comer peça" nem "dar xeque". O objetivo é **sobreviver mais tempo que o oponente**. Na prática, isso
significa garantir para si a maior área livre possível (o "espaço vital") e deixar o oponente confinado numa área
menor, para que ele fique sem saída antes.

## 2. Como o Minimax foi usado

### 2.1 Os papéis MAX e MIN

O Minimax é um algoritmo de decisão para jogos de dois jogadores com interesses opostos. Ele monta uma árvore com
todas as jogadas possíveis dali para frente e supõe que:

- o **MAX** (o agente que está decidindo, o Azul) sempre escolhe a jogada de **maior** valor;
- o **MIN** (o adversário, o Laranja) sempre escolhe a jogada de **menor** valor, ou seja, a resposta que mais
  atrapalha o MAX.

O valor de cada posição é medido **do ponto de vista do MAX**. Como o MIN sempre é considerado o mais esperto e
agressivo possível, o valor que o Minimax encontra é uma **garantia**: é o melhor resultado que o Azul consegue
assegurar contra **qualquer** resposta do Laranja.

### 2.2 Jogo simultâneo modelado em turnos

No Tron os dois jogadores andam **ao mesmo tempo**, mas o Minimax trabalha com **turnos alternados**. A solução,
comum em inteligências artificiais para esse jogo, foi dividir cada rodada em dois níveis da árvore:

1. **Nível MAX**: o Azul escolhe uma direção. O movimento **ainda não é aplicado** no tabuleiro.
2. **Nível MIN**: o Laranja escolhe a resposta. Só então os **dois movimentos são aplicados juntos** (função
   `aplicarRodada`), verificando colisões, inclusive a frontal.

Nesse modelo o MIN "enxerga" a jogada do MAX antes de responder. Essa é uma suposição **pessimista de propósito**:
se o Azul estiver seguro mesmo contra um adversário que sabe o que ele vai fazer, estará seguro contra qualquer
adversário real.

### 2.3 A árvore de decisão

- **Raiz**: a situação atual do jogo, com a vez do Azul (nó MAX).
- **Filhos de um nó MAX**: um nó MIN para cada direção segura do Azul.
- **Filhos de um nó MIN**: um nó MAX para cada direção segura do Laranja, já com a rodada aplicada.
- **Profundidade**: configurável de 1 a 5 **rodadas**, ou seja, de 2 a 10 níveis na árvore.
- **Fator de ramificação**: no máximo 3 por nível, porque voltar para trás é sempre bater no próprio rastro. As
  direções que batem em algo nem são geradas; se não sobrar nenhuma, o agente é obrigado a seguir em frente e bater.

Com profundidade 4, a árvore pode ter até 3⁸ = 6.561 folhas, o que mostra por que a poda alfa-beta (seção 2.7) é útil.

### 2.4 Estados finais: vitória, derrota e empate

Quando um nó representa o **fim do jogo**, o valor é fixo e não depende da heurística:

| Situação | Valor | Motivo |
|---|---|---|
| Laranja bateu e o Azul sobreviveu | **1000 + rodadas que sobraram** | Vencer mais cedo vale mais. |
| Azul bateu e o Laranja sobreviveu | **−(1000 + rodadas que sobraram)** | Se a derrota for inevitável, perder mais tarde é menos ruim. |
| Os dois bateram na mesma rodada | **−500** | O empate é melhor que perder, mas pior que qualquer posição em que o jogo continua. |

O valor do empate foi uma decisão importante. Na primeira versão ele valia 0, e o Azul às vezes batia de frente no
Laranja de propósito só porque a posição alternativa valia −1 (uma célula a menos de território). Com −500, o agente
só aceita empatar para escapar de uma derrota certa. Nas mesmas 30 partidas de teste, os empates do Azul
(profundidade 4) contra o Laranja com profundidade 1 e 2 caíram de 6 e 9 para zero.

### 2.5 Função de avaliação: território (o "espaço vital")

Na maioria das vezes a busca termina antes do fim do jogo (no limite de profundidade). Nesses nós, chamados
**folhas**, a posição é avaliada por uma **heurística de território**, inspirada no diagrama de Voronoi:

1. Uma **busca em largura (BFS)** calcula a distância do Azul até cada célula livre.
2. Outra BFS faz o mesmo para o Laranja.
3. Cada célula livre pertence a **quem chega nela primeiro**. Se os dois chegam ao mesmo tempo, ela é disputada e
   não conta para ninguém. Células que ninguém alcança também não contam.
4. **Valor = células do Azul − células do Laranja.**

Esse número traduz o raciocínio do enunciado: *"se eu virar à direita, fico com uma área de 10 blocos; se virar à
esquerda, deixo o inimigo confinado em 5 blocos"*. Quando os dois ficam separados por rastros, a heurística vira
simplesmente a diferença entre os tamanhos das duas regiões, e quem tem mais espaço tende a sobreviver mais tempo.

Na interface, a opção **Mostrar território** pinta cada célula com a cor do dono. É exatamente o que a função de
avaliação está medindo.

### 2.6 Exemplo de uma decisão

Posição usada nos testes automatizados (`#` = parede, `A` = Azul, `L` = Laranja):

```
#########
##A.#####    Se o Azul for para a direita, entra num beco de uma célula só.
##.######    Se for para baixo, chega à área aberta.
##......#
##......#
##......#
##......#
##.....L#
#########
```

**Com profundidade 1** (uma rodada, 2 níveis):

| Azul (MAX) | Respostas do Laranja (MIN) | Valor do nó MIN |
|---|---|---|
| → direita | ↑ cima: 0 − 29 = −29; ← esquerda: 0 − 29 = −29 | **−29** |
| ↓ baixo | ↑ cima: 11 − 17 = −6; ← esquerda: 10 − 18 = −8 | **−8** |

O Laranja (MIN) escolheria a resposta de menor valor em cada ramo. O Azul (MAX) compara −29 e −8 e escolhe o maior:
**↓ baixo**. Mesmo sem ver a batida, a heurística já percebe que o beco tem território zero.

**Com profundidade 2**, a busca enxerga a batida: o ramo "direita" passa a valer **−1000** (derrota) e o ramo
"baixo" vale −6. A decisão é a mesma, agora com a certeza de que o beco é fatal.

### 2.7 Poda alfa-beta

A poda alfa-beta é uma otimização do Minimax que chega **exatamente ao mesmo resultado** sem avaliar ramos que não
podem mudar a decisão. A busca carrega dois limites:

- **α (alfa)**: o melhor valor que o MAX já tem garantido em algum caminho explorado;
- **β (beta)**: o melhor valor (o menor) que o MIN já tem garantido em algum caminho explorado.

Quando **α ≥ β**, um dos jogadores já tem uma alternativa melhor em outro ponto da árvore e nunca deixaria o jogo
chegar ali, então os irmãos restantes são descartados (**podados**).

Números medidos na posição inicial de um labirinto 17 × 17:

| Profundidade | Nós (Minimax puro) | Nós (alfa-beta) | Redução | Tempo puro | Tempo alfa-beta |
|---|---|---|---|---|---|
| 1 rodada | 21 | 15 | 29% | 4 ms | 1 ms |
| 2 rodadas | 213 | 96 | 55% | 16 ms | 4 ms |
| 3 rodadas | 1.621 | 431 | 73% | 58 ms | 12 ms |
| 4 rodadas | 10.014 | 1.609 | 84% | 315 ms | 40 ms |
| 5 rodadas | 51.588 | 4.740 | 91% | 1.523 ms | 110 ms |

Com a poda, alguns valores da árvore deixam de ser exatos e passam a ser **limites**: `≤ 12` quer dizer "no máximo
12, e isso já basta para descartar este ramo"; `≥ 12` quer dizer "pelo menos 12". O modal da árvore mostra esses
símbolos e os ramos podados tracejados. Os valores do caminho escolhido são sempre exatos.

### 2.8 Como o Minimax entra em cada rodada da partida

A cada rodada:

1. O Azul roda o Minimax **a partir da situação atual** e pega a direção de maior valor.
2. O Laranja escolhe a jogada dele com a estratégia configurada. Se for Minimax, ele roda a **mesma função** com os
   papéis trocados: para ele, o Laranja é o MAX e o Azul é o MIN.
3. As duas jogadas são aplicadas juntas e a partida avança.

A árvore não é guardada durante a partida (seria muita memória). Quando o usuário abre o modal, o programa refaz a
busca para aquela rodada com a opção `registrarArvore` ligada. Como a busca é determinística, a árvore mostrada é
idêntica à que gerou a decisão.

## 3. Geração aleatória do labirinto

A cada **Resetar** é sorteada uma semente nova, e o labirinto é gerado assim:

1. As posições iniciais ficam em lados opostos (o Azul à esquerda e o Laranja no ponto espelhado à direita).
2. Segmentos de parede de 2 a 5 células, horizontais ou verticais, são sorteados até ocupar cerca de 20% do grid.
3. Cada parede é copiada na **posição espelhada (rotação de 180°)**. O labirinto fica diferente a cada vez, mas
   **justo**: os dois jogadores têm exatamente a mesma situação.
4. Uma área de raio 2 ao redor de cada posição inicial é mantida livre.
5. Uma BFS verifica se os dois jogadores estão conectados. Se não estiverem, sorteia de novo. Bolsões isolados são
   fechados com parede, para não existirem áreas inalcançáveis.

O número do labirinto (a semente) aparece no canto da tela, e **Reiniciar** joga de novo no mesmo labirinto, o que
permite comparar configurações diferentes na mesma situação.

## 4. O que cada parte do código faz

O código foi dividido em duas camadas. A pasta `js/logica` tem as regras e o algoritmo e não depende do navegador
(por isso pode ser testada com Node). A pasta `js/interface` cuida do que aparece na tela. Não há comentários no
código: os nomes das funções e variáveis foram escritos por extenso para explicar o que fazem.

### 4.1 `js/logica/aleatorio.js`

- **`criarGeradorAleatorio(semente)`**: gerador de números pseudoaleatórios com semente (algoritmo *mulberry32*). A
  mesma semente sempre gera a mesma sequência, o que torna labirintos e partidas reproduzíveis.
- **`sortearInteiro`** e **`sortearElemento`**: sorteiam um número num intervalo ou um item de uma lista.
- **`gerarSementeAleatoria`**: cria uma semente nova para cada labirinto.

### 4.2 `js/logica/tabuleiro.js`

- Constantes das células: **livre**, **parede**, **rastro azul** e **rastro laranja**. O tabuleiro é um vetor
  (`Uint8Array`) de tamanho × tamanho, compacto e rápido de copiar.
- **`DIRECOES`**: as quatro direções com nome, seta e deslocamento em linha e coluna.
- **`indiceDaCelula`**, **`linhaDoIndice`**, **`colunaDoIndice`**: convertem entre (linha, coluna) e a posição no vetor.
- **`vizinhoNaDirecao`**: devolve a célula vizinha numa direção, ou `FORA_DO_TABULEIRO`.
- **`vizinhosDentroDoTabuleiro`**: os vizinhos válidos de uma célula (usado nas BFS).
- **`indiceEspelhado`**: a posição rotacionada em 180°, usada para gerar o labirinto simétrico.

### 4.3 `js/logica/labirinto.js`

- **`calcularPosicoesIniciais`**: Azul na linha do meio, perto da borda esquerda; Laranja no ponto espelhado.
- **`sortearParedesSimetricas`**: sorteia os segmentos de parede e os espelha, sem encostar nas posições iniciais.
- **`encontrarCelulasAlcancaveis`**: BFS que marca todas as células livres alcançáveis a partir de uma origem.
- **`fecharBolsoesIsolados`**: confere se os dois jogadores estão conectados e transforma em parede as áreas isoladas.
- **`gerarLabirinto(tamanho, semente)`**: junta tudo e tenta até 50 sorteios até conseguir um labirinto válido.

### 4.4 `js/logica/jogo.js`

- **`criarEstadoInicial`**: monta o estado da partida (células, posições, trilhas, quem está vivo, rodada).
- **`movimentosSeguros`**: direções que levam a uma célula livre.
- **`movimentosPossiveis`**: os movimentos seguros ou, se não houver nenhum, a direção atual (o agente bate).
- **`aplicarRodada`**: aplica os dois movimentos **ao mesmo tempo**, detecta batidas e colisão frontal e devolve um
  **estado novo**, sem alterar o anterior. Essa imutabilidade é o que permite ao Minimax explorar vários futuros a
  partir do mesmo estado sem precisar "desfazer" jogadas.
- **`aplicarRodadaPorPapel`**: mesma coisa, mas recebendo as jogadas como "do maximizador" e "do minimizador". É o
  que permite usar a mesma busca para o Azul e para o Laranja.
- **`listarTrilha`**: devolve o caminho percorrido por um jogador em ordem. As trilhas são guardadas como lista
  encadeada (cada passo aponta para o anterior), então acrescentar um passo não copia nada e não pesa na busca.
- **`jogoTerminou`**, **`vencedorDoJogo`**, **`descreverCausaDaColisao`**: informam se acabou, quem venceu e por que
  cada um bateu (parede, próprio rastro, rastro do oponente, fora do tabuleiro ou colisão frontal).

### 4.5 `js/logica/avaliacao.js`

- **`calcularDistanciasAPartirDe`**: BFS que calcula a distância de uma cabeça até cada célula livre.
- **`calcularTerritorios`**: roda a BFS para os dois jogadores e decide o dono de cada célula (quem chega primeiro).
  Devolve a contagem de cada um e o mapa de donos, que também é usado para pintar o território na tela.
- **`avaliarPosicao(estado, jogadorMaximizador)`**: a **função de avaliação** do Minimax: território do MAX menos
  território do MIN.
- **`contarEspacoAlcancavel`**: quantas células um jogador alcança (usado pela estratégia gulosa).

### 4.6 `js/logica/minimax.js`: o algoritmo

- **`buscarMelhorMovimento(estado, jogadorMaximizador, opções)`**: ponto de entrada. Recebe a profundidade em
  rodadas, se deve usar poda alfa-beta e se deve registrar a árvore. Devolve a melhor jogada, o valor, os nós
  visitados, os ramos podados, o tempo e, se pedido, a árvore completa.
- **`valorNoMaximizador`**: o nó MAX (equivale ao `MAX-VALUE` do livro de Russell e Norvig):
  1. se o jogo acabou, devolve o valor de vitória, derrota ou empate (`avaliarFimDeJogo`);
  2. se chegou ao limite de profundidade, devolve a avaliação de território (`avaliarPosicao`);
  3. senão, testa cada movimento do MAX chamando `valorNoMinimizador` e fica com o **maior** valor;
  4. com poda ligada, atualiza **α** e interrompe o laço quando **α ≥ β**.
- **`valorNoMinimizador`**: o nó MIN (`MIN-VALUE`). Para cada resposta do MIN, aplica a rodada completa e chama
  `valorNoMaximizador` com uma rodada a menos. Fica com o **menor** valor e, com poda, atualiza **β** e corta quando
  **α ≥ β**.
- **`avaliarFimDeJogo`**: os valores de vitória (1000 + rodadas restantes), derrota e empate (−500).
- **Registro da árvore** (`criarNoDaArvore`, `criarNoFilho`, `registrarRamosPodados`, `concluirNoInterno`,
  `classificarValor`): quando `registrarArvore` está ligado, cada nó guarda tipo (MAX/MIN), jogada, caminho desde a
  raiz, janela alfa-beta na entrada, valor, se o valor é exato ou um limite (≤ / ≥), qual filho foi o melhor, se
  foi podado e, nas folhas, a avaliação de território. Sem essa opção, nada é registrado e a busca fica mais leve.
- **`obterCaminhoPrincipal`**: segue o melhor filho de cada nó a partir da raiz. É a sequência de jogadas que o
  Minimax espera que aconteça (em dourado no modal).
- **`valorIndicaVitoria`**, **`valorIndicaDerrota`**, **`valorIndicaEmpate`**: identificam valores de fim de jogo para exibição.

### 4.7 `js/logica/estrategias.js`

- **Minimax** (`decidirComMinimax`): chama `buscarMelhorMovimento` com a profundidade configurada.
- **Guloso** (`decidirComEstrategiaGulosa`): escolhe a direção que deixa mais células alcançáveis logo em seguida,
  sem pensar no oponente. Serve de comparação.
- **Aleatório** (`decidirAleatoriamente`): sorteia entre as direções seguras.
- **`decidirMovimento`**: chama a estratégia configurada para o agente.

### 4.8 `js/logica/partida.js`

- **`iniciarPartida`** e **`reiniciarPartidaNoMesmoLabirinto`**: criam a partida (labirinto, estado inicial, histórico vazio).
- **`jogarProximaRodada`**: pede a decisão dos dois agentes **sobre o mesmo estado**, aplica a rodada e guarda um
  registro com o estado antes e depois, as decisões e a configuração usada.
- **`reconstruirArvoreDeDecisao`**: refaz a busca de uma rodada com o registro da árvore ligado, para o modal.

### 4.9 `js/interface/aplicacao.js`

É o controlador da página:

- lê a configuração da tela (`lerConfiguracaoDosAgentes`);
- **Resolver/Pausar** (`resolver`, `pausar`, `agendarProximoPasso`): executa uma rodada e agenda a próxima com
  `setTimeout`. O intervalo é `1000 / passos por segundo`, então mexer na velocidade vale já para o passo seguinte;
- **Próximo passo** (`executarUmPasso`), **Reiniciar** e **Resetar** (`comecarComNovoLabirinto`);
- atualiza tabuleiro, placar de território, resultado final, tabela da última decisão e a lista de acompanhamento
  (`atualizarTela`, `criarItemDoHistorico`);
- abre o modal da árvore para a última rodada, para a próxima jogada ou para qualquer rodada do acompanhamento;
- atalhos de teclado: `Espaço`, `→` e `A`.

### 4.10 `js/interface/desenho-do-tabuleiro.js`

Desenha o estado no `<canvas>`: fundo e grade, território (se ligado), paredes, células ocupadas, as **trilhas de
luz** (linha contínua com brilho), as cabeças, o movimento pendente (tracejado, usado na prévia dos nós MIN) e um X
vermelho onde houve batida. As cores vêm das variáveis do CSS e o desenho se ajusta à densidade de pixels da tela.

### 4.11 `js/interface/arvore-de-decisao.js`

O modal da árvore de decisão:

- **`calcularLayout`**: posiciona só os nós visíveis. Cada folha visível ganha uma coluna e cada pai fica centralizado
  sobre os filhos.
- **`criarElementoDoNo`** e **`criarAresta`**: desenham em SVG os nós (retângulo para MAX, pílula para MIN, com
  jogada, valor e tipo) e as ligações. O caminho escolhido fica em dourado e os ramos podados ficam tracejados.
- **Interação**: clicar num nó mostra ou esconde os filhos e mantém o nó parado na tela; há botões para expandir o
  caminho escolhido, expandir um nível, recolher tudo e dar zoom. Existe um limite de 800 nós visíveis para a página
  não travar.
- **`reconstruirEstadoDoNo`**: reaplica as jogadas do caminho desde a raiz para mostrar o tabuleiro daquele nó.
- **`montarDescricaoDoNo`**: explica o nó selecionado (quem joga, valor, por que aquele filho foi escolhido, conta
  da heurística nas folhas, significado de ≤/≥, janela α/β e o motivo das podas).

### 4.12 `js/interface/formatacao.js`, `index.html`, `estilos.css` e `servidor.js`

- **`formatacao.js`**: números no padrão brasileiro, valores do Minimax ("vitória", "empate", "derrota", "+12"),
  setas das jogadas e descrição da profundidade.
- **`index.html`**: estrutura da página, controles, painel lateral e o `<dialog>` da árvore.
- **`estilos.css`**: tema escuro no estilo Tron, layout responsivo (funciona também no celular) e estilos dos nós da árvore.
- **`servidor.js`**: servidor HTTP mínimo em Node, sem dependências, que serve os arquivos da pasta e bloqueia o
  acesso a arquivos fora dela.

### 4.13 `testes/`

24 testes com `node --test`:

- **Labirinto**: mesma semente gera o mesmo labirinto; sementes diferentes geram labirintos diferentes; o labirinto é
  simétrico; todas as células livres são alcançáveis.
- **Regras**: movimentos seguros, colisão frontal, causa de cada batida, imutabilidade do estado, ordem das trilhas.
- **Avaliação**: dono de cada célula e troca de sinal conforme o ponto de vista.
- **Minimax**: evita o beco sem saída; enxerga a derrota com 2 rodadas; só reconhece a vitória quando ela está
  dentro da profundidade; empate inevitável vale −500; **a poda alfa-beta dá o mesmo valor e a mesma jogada que o
  Minimax puro** em dezenas de posições; a árvore registrada bate com as estatísticas da busca.
- **Partidas**: sempre terminam com um resultado válido, e o Minimax mais profundo vence o mais raso na maioria dos labirintos.

## 5. Resultados

Partidas automáticas em 30 labirintos 17 × 17 diferentes:

| Azul | Laranja | Vitórias do Azul | Vitórias do Laranja | Empates |
|---|---|---|---|---|
| Minimax, 4 rodadas | Minimax, 1 rodada | 25 | 5 | 0 |
| Minimax, 4 rodadas | Minimax, 2 rodadas | 18 | 12 | 0 |
| Minimax, 4 rodadas | Guloso | 26 | 4 | 0 |
| Minimax, 3 rodadas | Minimax, 3 rodadas | 14 | 13 | 3 |
| Minimax, 1 rodada | Minimax, 4 rodadas | 8 | 22 | 0 |

- Enxergar mais longe faz diferença: profundidade 4 contra 1 vence 83% das partidas.
- Com as profundidades trocadas, o resultado também se inverte, então o que decide é o algoritmo, não o lado do tabuleiro.
- Com profundidades iguais o jogo fica equilibrado, como esperado num labirinto simétrico.
- No computador usado nos testes, cada rodada com profundidade 4 e poda levou no máximo cerca de 100 ms, então a
  animação roda sem travar.

## 6. Decisões de projeto e limitações

- **Heurística**: a contagem de território não considera que algumas áreas não podem ser percorridas por inteiro
  (becos com entrada e saída pela mesma célula). Uma melhoria seria estimar o maior caminho possível em cada região.
- **Horizonte limitado**: com profundidade pequena, o agente pode não perceber uma armadilha que só se fecha além do
  que ele enxerga (o "efeito horizonte"). Aumentar a profundidade reduz esse problema, mas o custo cresce exponencialmente.
- **Ordem das jogadas**: as direções são testadas sempre na mesma ordem (cima, direita, baixo, esquerda). Testar
  primeiro as jogadas mais promissoras aumentaria o número de podas.
- **Adversário pessimista**: supor que o oponente vê a jogada antes de responder deixa o agente mais cauteloso do
  que o necessário contra adversários fracos, mas é o que garante a segurança da decisão.

## 7. Roteiro sugerido para a apresentação

1. Mostre o labirinto e clique em **Resetar** algumas vezes para mostrar que ele muda (e que é simétrico).
2. Ligue **Mostrar território** e explique que a cor de cada célula é a função de avaliação.
3. Clique em **Próximo passo** algumas vezes e abra **Ver árvore de decisão**: raiz MAX, filhos MIN, caminho
   dourado, folhas com a conta de território e ramos podados.
4. Clique num nó MIN e depois numa folha para mostrar o tabuleiro de cada momento e a explicação do valor.
5. Clique em **Resolver**, acelere e desacelere, e pause no momento em que um agente cerca o outro.
6. Desligue a **poda alfa-beta**, jogue uma rodada e compare os nós visitados: mesma jogada, muito mais trabalho.
7. Use **Reiniciar** com profundidades diferentes para mostrar que enxergar mais longe muda o resultado.
