# Explicação do projeto: Minimax na Fuga no Labirinto (estilo Tron)

Este texto foi escrito para quem vai **explicar** o projeto. A seção 0 resume tudo em um minuto. As seções 1 a 4
explicam o problema e o algoritmo com exemplos de verdade, tirados do código. As seções 5 e 6 mostram como a busca foi
acelerada (paralelismo e versão em C++). A seção 8 percorre o código arquivo por arquivo, e as seções 11 e 12 trazem
perguntas que o professor pode fazer e um roteiro para a apresentação.

## 0. Resumo em um minuto

- **Problema**: duas motos de luz (Azul e Laranja) andam ao mesmo tempo num labirinto deixando um rastro sólido.
  Quem bater primeiro perde. O labirinto é gerado aleatoriamente a cada partida.
- **Algoritmo**: o Azul decide cada movimento com **Minimax**. Ele simula as próximas rodadas numa árvore, supondo
  que ele (MAX) escolhe sempre o melhor para si e que o Laranja (MIN) escolhe sempre o pior para o Azul.
- **Folhas da árvore**: quando a simulação para (limite de profundidade), a posição é avaliada pelo **território**:
  quantas células livres o Azul alcança antes do Laranja, menos quantas o Laranja alcança antes do Azul.
- **Fim de jogo na árvore**: vitória vale 1000 (mais as rodadas que sobraram), derrota vale −1000 e empate vale −500.
- **Poda alfa-beta**: corta ramos que não podem mudar a decisão. A jogada escolhida é **sempre a mesma** do Minimax
  puro, mas visitando de 29% a 76% menos nós.
- **Aceleração**: a partir da profundidade 5, cada movimento da raiz é calculado num **processo separado** (cerca de
  2 vezes mais rápido). Existe também uma **versão experimental em C++** do mesmo algoritmo, cerca de 30 vezes mais
  rápida, que não é usada pela página.
- **Resultado**: enxergar mais longe ganha. Profundidade 3 contra 1 venceu 99 de 120 partidas; contra um agente guloso
  que ignora o oponente, o Minimax venceu 19 de 20.

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

### 1.1 Por que o Minimax serve para este problema

O Minimax é o algoritmo clássico de **busca adversarial**: serve para jogos em que há **dois jogadores com
objetivos opostos** (o que é bom para um é ruim para o outro), **sem sorte** (as regras são determinísticas) e com
**informação completa** (os dois veem o tabuleiro inteiro). O Tron tem as três características. A única diferença
para um jogo de tabuleiro comum é que as jogadas são **simultâneas**; a seção 3.2 mostra como isso foi resolvido.

### 1.2 Como o projeto está organizado

- **Python (pasta `logica/`)**: todo o algoritmo. O Minimax, a poda alfa-beta, a função de avaliação, as regras do
  jogo, a geração do labirinto e os agentes de comparação.
- **Servidor (`servidor.py`)**: um servidor HTTP da biblioteca padrão do Python que entrega a página e responde aos
  pedidos dela em JSON.
- **Navegador (`index.html`, `estilos.css` e `js/interface/`)**: só a interface. Desenha o tabuleiro e a árvore,
  controla a velocidade e os botões, e pede ao Python cada jogada. Nenhuma decisão é calculada em JavaScript.

O caminho de uma jogada, do clique até a tela:

```
Navegador (JavaScript)                          Servidor (Python)
──────────────────────                          ─────────────────
clique em "Próximo passo"
  envia o estado atual e a configuração  ───►  /api/jogar-rodada
                                                 1. Minimax do Azul escolhe a direção
                                                 2. o Laranja escolhe a dele
                                                 3. aplica as duas juntas (colisões)
  desenha o novo estado, o placar e a    ◄───   devolve o novo estado, as decisões,
  tabela da decisão                             o território e quem bateu
```

## 2. Vocabulário

| Termo | O que significa neste projeto |
|---|---|
| **Estado** | Uma "fotografia" da partida: o tabuleiro (paredes e rastros), onde está cada cabeça, quem está vivo e o número da rodada. |
| **Rodada** | Os dois jogadores andam uma célula. Na árvore, uma rodada ocupa **dois níveis**: um do MAX e um do MIN. |
| **Nó** | Um ponto da árvore de decisão. Cada nó representa um momento do jogo simulado. |
| **Nó MAX / nó MIN** | Nó em que quem escolhe é o Azul (quer o **maior** valor) / o Laranja (quer o **menor** valor). |
| **Raiz** | O nó do topo: a situação atual do jogo, com a vez do Azul. |
| **Folha** | Nó onde a simulação para: o jogo acabou ou a profundidade chegou ao limite. |
| **Profundidade** | Quantas rodadas à frente o Minimax simula (de 1 a 7 na página). |
| **Fator de ramificação** | Quantos filhos cada nó tem: no máximo 3 aqui, porque voltar é bater no próprio rastro (4 na primeira jogada). |
| **Função de avaliação (heurística)** | A nota dada a uma folha que não é fim de jogo. Aqui: território do Azul − território do Laranja. |
| **Valor minimax** | O valor que "sobe" da folha até a raiz: máximo nos nós MAX, mínimo nos nós MIN. |
| **α (alfa)** | O melhor valor que o MAX já tem garantido por algum caminho já explorado. |
| **β (beta)** | O melhor valor (o menor) que o MIN já tem garantido por algum caminho já explorado. |
| **Poda** | Deixar de calcular um ramo porque ele não pode mudar a decisão (quando α ≥ β). |
| **Caminho principal** | A sequência de jogadas que o Minimax espera que aconteça (em dourado no modal da árvore). |
| **Efeito horizonte** | Não ver um perigo que só acontece depois do limite de profundidade. |
| **BFS (busca em largura)** | Percorre o tabuleiro em "ondas": primeiro as células a 1 passo, depois a 2, e assim por diante. |

## 3. Como o Minimax foi usado

### 3.1 Os papéis MAX e MIN

O Minimax monta uma árvore com as jogadas possíveis dali para frente e supõe que:

- o **MAX** (o agente que está decidindo, o Azul) sempre escolhe a jogada de **maior** valor;
- o **MIN** (o adversário, o Laranja) sempre escolhe a jogada de **menor** valor, ou seja, a resposta que mais
  atrapalha o MAX.

O valor de cada posição é medido **do ponto de vista do MAX**. Como o MIN sempre é considerado o mais esperto e
agressivo possível, o valor que o Minimax encontra é uma **garantia**: é o melhor resultado que o Azul consegue
assegurar contra **qualquer** resposta do Laranja. Se o Laranja jogar pior do que isso, melhor ainda para o Azul.

Quando o Laranja também usa Minimax, ele roda **a mesma função** com os papéis trocados: para ele, o Laranja é o MAX
e o Azul é o MIN.

### 3.2 Jogo simultâneo modelado em turnos

No Tron os dois jogadores andam **ao mesmo tempo**, mas o Minimax trabalha com **turnos alternados**. A solução,
comum em inteligências artificiais para esse jogo, foi dividir cada rodada em dois níveis da árvore:

1. **Nível MAX**: o Azul escolhe uma direção. O movimento **ainda não é aplicado** no tabuleiro.
2. **Nível MIN**: o Laranja escolhe a resposta. Só então os **dois movimentos são aplicados juntos**, verificando
   colisões, inclusive a frontal (função `fazer_rodada_in_place`, seção 6.1).

Nesse modelo o MIN "enxerga" a jogada do MAX antes de responder. Essa é uma suposição **pessimista de propósito**:
se o Azul estiver seguro mesmo contra um adversário que sabe o que ele vai fazer, estará seguro contra qualquer
adversário real. Por isso o nó MIN não verifica se o jogo acabou: a rodada só é aplicada depois da resposta do MIN,
e quem verifica o fim de jogo é o nó MAX seguinte.

### 3.3 A árvore de decisão

- **Raiz**: a situação atual do jogo, com a vez do Azul (nó MAX).
- **Filhos de um nó MAX**: um nó MIN para cada direção segura do Azul.
- **Filhos de um nó MIN**: um nó MAX para cada direção segura do Laranja, já com a rodada aplicada.
- **Profundidade**: configurável de 1 a 7 **rodadas**, ou seja, de 2 a 14 níveis na árvore. O modal desenha a árvore
  até a profundidade 5 (seção 6.4).
- **Fator de ramificação**: no máximo 3 por nível, porque voltar para trás é sempre bater no próprio rastro (na
  primeira jogada são 4, porque ainda não há rastro atrás). As direções que batem em algo nem são geradas; se não
  sobrar nenhuma, o agente é obrigado a seguir em frente e bater.

A árvore cresce muito rápido. Com fator 3, cada rodada multiplica o número de folhas por até 3 × 3 = 9: com
profundidade 4 (8 níveis) são até 3⁸ = 6.561 folhas, e com profundidade 7 (14 níveis), até 3¹⁴ ≈ 4,8 milhões. Na
prática há menos, porque paredes e rastros eliminam direções, mas o crescimento continua **exponencial**. É por isso
que existem a poda alfa-beta (seção 4) e o limite de profundidade.

### 3.4 Estados finais: vitória, derrota e empate

Quando um nó representa o **fim do jogo**, o valor é fixo e não depende da heurística:

| Situação | Valor | Motivo |
|---|---|---|
| Laranja bateu e o Azul sobreviveu | **1000 + rodadas que sobraram** | Vencer mais cedo vale mais. |
| Azul bateu e o Laranja sobreviveu | **−(1000 + rodadas que sobraram)** | Se a derrota for inevitável, perder mais tarde é menos ruim. |
| Os dois bateram na mesma rodada | **−500** | O empate é melhor que perder, mas pior que qualquer posição em que o jogo continua. |

O 1000 foi escolhido por ser maior que qualquer diferença de território possível (o maior labirinto aceito, de
31 × 31, tem 961 células), então uma vitória sempre vale mais que qualquer posição boa, e uma derrota sempre vale menos que qualquer
posição ruim.

O valor do empate foi uma decisão importante. Na primeira versão ele valia 0, e o Azul às vezes batia de frente no
Laranja de propósito só porque a posição alternativa valia −1 (uma célula a menos de território). Com −500, o agente
só aceita empatar para escapar de uma derrota certa. Nas mesmas 30 partidas de teste, os empates do Azul
(profundidade 4) contra o Laranja com profundidade 1 e 2 caíram de 6 e 9 para zero.

### 3.5 Função de avaliação: território (o "espaço vital")

Na maioria das vezes a busca termina antes do fim do jogo (no limite de profundidade). Nessas **folhas**, a posição é
avaliada por uma **heurística de território**, inspirada no diagrama de Voronoi:

1. Uma **busca em largura (BFS)** parte das duas cabeças **ao mesmo tempo**, camada por camada: primeiro as
   células a 1 passo de cada jogador, depois as a 2 passos, e assim por diante.
2. Cada célula livre pertence a **quem chega nela primeiro**. Se os dois chegam na mesma camada, ela é disputada e
   não conta para ninguém. Células que ninguém alcança também não contam.
3. **Valor = células do Azul − células do Laranja.**

Exemplo mínimo (um corredor, usado nos testes):

```
A . . . L      camada 1: o Azul alcança a 2ª célula; o Laranja, a 4ª
               camada 2: os dois chegam à 3ª célula ao mesmo tempo → disputada
               território: Azul 1, Laranja 1 → valor 1 − 1 = 0
```

Esse número traduz o raciocínio do enunciado: *"se eu virar à direita, fico com uma área de 10 blocos; se virar à
esquerda, deixo o inimigo confinado em 5 blocos"*. Quando os dois ficam separados por rastros, a heurística vira
simplesmente a diferença entre os tamanhos das duas regiões, e quem tem mais espaço tende a sobreviver mais tempo.

Fazer uma única busca simultânea, em vez de uma busca para cada jogador seguida da comparação das distâncias, deixou
a avaliação cerca de duas vezes mais rápida em Python. Um dos testes automatizados confere, em centenas de posições,
que as duas formas dão exatamente o mesmo resultado.

Na interface, a opção **Mostrar território** pinta cada célula com a cor do dono. É exatamente o que a função de
avaliação está medindo.

### 3.6 O algoritmo passo a passo

O código segue o pseudocódigo do livro de Russell e Norvig (*Inteligência Artificial*, funções `MAX-VALUE` e
`MIN-VALUE`), com uma adaptação: como a rodada é simultânea, o nó MIN recebe o movimento do MAX e só aplica a rodada
depois de escolher a resposta.

```
função VALOR-MAX(estado, rodadas_restantes, α, β):          → _valor_no_maximizador
    se o jogo acabou: devolva vitória, derrota ou empate      → _avaliar_fim_de_jogo
    se rodadas_restantes = 0: devolva o território            → avaliar_posicao
    melhor ← −∞
    para cada direção segura m do MAX:
        v ← VALOR-MIN(estado, m, rodadas_restantes, α, β)
        melhor ← máximo(melhor, v)
        α ← máximo(α, melhor)
        se α ≥ β: pare o laço (os irmãos restantes são podados)
    devolva melhor

função VALOR-MIN(estado, m, rodadas_restantes, α, β):       → _valor_no_minimizador
    pior ← +∞
    para cada direção segura r do MIN:
        aplique a rodada (m, r) no estado                     → fazer_rodada_in_place
        v ← VALOR-MAX(estado, rodadas_restantes − 1, α, β)
        desfaça a rodada                                      → desfazer_rodada_in_place
        pior ← mínimo(pior, v)
        β ← mínimo(β, pior)
        se α ≥ β: pare o laço (os irmãos restantes são podados)
    devolva pior

jogada escolhida = a direção da raiz com o maior VALOR-MIN   → buscar_melhor_movimento
```

A recursão desce até as folhas, e os valores **sobem**: cada nó MIN fica com o menor valor dos filhos, e cada nó MAX
com o maior. O valor que chega à raiz é a garantia do Azul, e a direção que o produziu é a jogada.

### 3.7 Exemplo de uma decisão (números reais, tirados do código)

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

**Com profundidade 1** (uma rodada, 2 níveis). A árvore completa é esta:

```
                         MAX (Azul) = −8   → escolhe ↓ baixo
                  ┌──────────────┴──────────────┐
        MIN: Azul → direita = −29      MIN: Azul ↓ baixo = −8
           ┌──────┴──────┐                ┌──────┴──────┐
     Laranja ↑ cima  ← esquerda     Laranja ↑ cima  ← esquerda
      0 − 29 = −29   0 − 29 = −29    11 − 17 = −6   10 − 18 = −8
```

1. As folhas são avaliadas pelo território (Azul − Laranja). No ramo "direita", o Azul fica preso no beco: 0 células
   contra 29.
2. Cada nó MIN fica com o **menor** valor dos filhos: −29 no ramo "direita" e −8 no ramo "baixo" (o Laranja escolheria
   "esquerda", que é pior para o Azul).
3. A raiz (MAX) fica com o **maior**: −8. A jogada é **↓ baixo**.

Mesmo sem ver a batida, a heurística já percebe que o beco tem território zero.

**Com profundidade 2**, a busca enxerga a batida: o ramo "direita" passa a valer **−1000** (derrota) e o ramo
"baixo" vale −6. A decisão é a mesma, agora com a certeza de que o beco é fatal.

## 4. Poda alfa-beta

### 4.1 A ideia

A poda alfa-beta é uma otimização do Minimax que chega **exatamente ao mesmo resultado** sem avaliar ramos que não
podem mudar a decisão. A busca carrega dois limites:

- **α (alfa)**: o melhor valor que o MAX já tem garantido em algum caminho explorado (começa em −∞);
- **β (beta)**: o melhor valor (o menor) que o MIN já tem garantido em algum caminho explorado (começa em +∞).

Quando **α ≥ β**, um dos jogadores já tem uma alternativa melhor em outro ponto da árvore e nunca deixaria o jogo
chegar ali, então os irmãos restantes são descartados (**podados**).

### 4.2 Exemplo passo a passo

Usando os números reais do exemplo do beco (seção 3.7), imagine que o Azul testasse **↓ baixo antes de → direita**:

1. **Ramo "baixo"**: o Laranja responde "cima" (−6) e "esquerda" (−8). O ramo vale −8. Agora **α = −8**: o Azul já
   garante pelo menos −8.
2. **Ramo "direita"**: a primeira resposta do Laranja ("cima") já dá −29. Neste nó MIN, **β = −29**: o Laranja
   garante que este ramo vale no máximo −29.
3. **α = −8 ≥ β = −29**: o Azul nunca escolheria "direita", porque já tem −8 garantido indo para baixo, e as outras
   respostas do Laranja só poderiam deixar este ramo **ainda menor**. A resposta "esquerda" nem é calculada: é
   **podada**. O nó fica com o valor "≤ −29" (um limite, não um valor exato).

Na ordem real do código (cima, direita, baixo, esquerda), o ramo "direita" é testado primeiro e nesta posição pequena
não há poda. Em labirintos de verdade, com milhares de nós, as podas acontecem o tempo todo, como mostra a tabela
abaixo. Isso também mostra que **a ordem em que as jogadas são testadas importa**: testar primeiro as melhores
jogadas faz a poda cortar mais.

### 4.3 Quanto a poda economiza

Números medidos em Python na posição inicial de um labirinto 17 × 17 (semente 7), com a busca sequencial (a da
seção 3.6). Nos cinco casos, o Minimax puro e a versão com poda escolheram a mesma jogada, com o mesmo valor:

| Profundidade | Nós (Minimax puro) | Nós (alfa-beta) | Redução | Tempo puro | Tempo alfa-beta |
|---|---|---|---|---|---|
| 1 rodada | 21 | 15 | 29% | 2 ms | 1 ms |
| 2 rodadas | 213 | 107 | 50% | 12 ms | 5 ms |
| 3 rodadas | 1.858 | 711 | 62% | 103 ms | 35 ms |
| 4 rodadas | 10.482 | 3.315 | 68% | 512 ms | 149 ms |
| 5 rodadas | 61.212 | 14.462 | 76% | 3.057 ms | 640 ms |

Quanto mais profunda a árvore, maior a economia. Na teoria, com fator de ramificação *b* e *d* níveis, o Minimax
visita cerca de *b*ᵈ nós; com a poda e as jogadas testadas na melhor ordem possível, cerca de *b*ᵈ⸍² (é como se
desse para enxergar o dobro de níveis com o mesmo trabalho).

### 4.4 Valores exatos e limites

Com a poda, alguns valores da árvore deixam de ser exatos e passam a ser **limites**: `≤ 12` quer dizer "no máximo
12, e isso já basta para descartar este ramo"; `≥ 12` quer dizer "pelo menos 12". O modal da árvore mostra esses
símbolos e os ramos podados tracejados. Os valores do caminho escolhido são sempre exatos.

### 4.5 Como o Minimax entra em cada rodada da partida

A cada rodada, o navegador envia ao servidor Python a situação atual do jogo e a configuração dos agentes
(rota `/api/jogar-rodada`). O Python então:

1. Roda o Minimax do Azul **a partir da situação atual** e pega a direção de maior valor.
2. O Laranja escolhe a jogada dele com a estratégia configurada (Minimax, Guloso ou Aleatório).
3. Aplica as duas jogadas juntas e devolve o novo estado, as decisões (jogada, valor, nós visitados, podas e
   tempo), a causa de uma eventual batida e o território de cada um.

A árvore não é guardada durante a partida (seria muita memória). Quando o usuário abre o modal, o navegador pede ao
Python (rota `/api/arvore`) que refaça a busca daquela rodada com a opção `registrar_arvore` ligada. Como a busca é
determinística e usa o mesmo modo (sequencial ou paralelo) da partida, a árvore mostrada é idêntica à que gerou a
decisão, com os mesmos números. Ao clicar num nó, o navegador pede o tabuleiro daquele momento (rota
`/api/estado-do-no`), que o Python reconstrói reaplicando as jogadas do caminho.

## 5. Geração aleatória do labirinto

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

## 6. Deixando a busca mais rápida

O Minimax é caro por natureza (crescimento exponencial), e Python é uma linguagem interpretada, mais lenta que C++
ou Java para laços como os da busca. O projeto usa três técnicas para acelerar, além da poda.

### 6.1 Fazer e desfazer a rodada no próprio estado

A função `aplicar_rodada` devolve um **estado novo**, sem alterar o anterior. Isso é simples e seguro, mas obriga a
copiar o tabuleiro em cada nó. Dentro da busca, o Minimax usa outra técnica, a mesma dos programas de xadrez
("fazer/desfazer" a jogada):

1. **`fazer_rodada_in_place`** altera o próprio estado e devolve uma **`ReversaoDeRodada`**, com tudo o que foi
   mudado: as posições antigas, quem estava vivo, os últimos movimentos, os pontos de colisão e as duas células que
   foram pintadas com rastro.
2. O filho é avaliado com o estado alterado.
3. **`desfazer_rodada_in_place`** usa a reversão para voltar **exatamente** ao estado anterior, e o próximo filho é
   testado.

O desfazer precisa ser perfeito: a busca reaproveita o mesmo objeto em milhares de nós, e se um único campo não
voltasse, todo o resto da árvore seria calculado num tabuleiro errado. Um teste confere isso com as 16 combinações
de movimentos em todas as posições de 8 partidas aleatórias: o estado depois de "fazer" é igual ao de
`aplicar_rodada`, e depois de "desfazer" é igual ao original.

Resultado medido: mesmas jogadas e mesmos valores, com ganho de tempo quase nulo em Python (no máximo 4%), porque o que
custa caro é a avaliação de território nas folhas, e não copiar um tabuleiro de 289 bytes. Fora da busca (na partida, na API
e na reconstrução dos nós do modal) continua sendo usado o `aplicar_rodada`, que é mais simples.

### 6.2 Raiz da árvore em paralelo (a partir da profundidade 5)

Um computador tem vários núcleos, mas um programa Python comum usa só um: o **GIL** (*Global Interpreter Lock*) só
deixa uma *thread* executar código Python por vez. Para usar vários núcleos é preciso usar **processos**, que é o que
o `concurrent.futures.ProcessPoolExecutor` faz.

A divisão escolhida é a mais simples: **cada movimento da raiz vira uma tarefa independente**.

```
                        Raiz (MAX, Azul)
          ┌─────────────────┼─────────────────┐
      processo 1        processo 2        processo 3
    ramo ↑ cima       ramo → direita     ramo ↓ baixo
   (alfa-beta          (alfa-beta        (alfa-beta
    completo lá         completo lá       completo lá
    dentro)             dentro)           dentro)
          └─────────────────┼─────────────────┘
          a raiz compara os três valores e fica com o maior
```

Cada processo recebe uma cópia do estado, roda o nó MIN do seu ramo (`_avaliar_ramo_da_raiz`) e devolve o valor,
os nós visitados, as podas e, se o modal pediu, o pedaço da árvore. A raiz escolhe o maior valor, exatamente como no
Minimax sequencial.

**O custo: a raiz perde a poda.** Na busca sequencial, o segundo ramo da raiz já começa sabendo quanto o primeiro
valeu (α). Em paralelo, os ramos rodam **ao mesmo tempo**, então todos começam com α = −∞ e β = +∞. A poda continua
funcionando dentro de cada ramo, mas os ramos da raiz nunca são podados, e mais nós são visitados. A jogada e o valor
continuam **idênticos** (um teste confere isso), só o trabalho muda.

Medições no Windows, posição inicial de um labirinto 17 × 17 (semente 7), computador com 12 núcleos lógicos:

| Profundidade | Nós (sequencial) | Tempo (sequencial) | Nós (paralelo) | Tempo (paralelo) | Modo usado pela página |
|---|---|---|---|---|---|
| 1 | 15 | 1 ms | 21 | 2 ms | sequencial |
| 2 | 107 | 7 ms | 172 | 4 ms | sequencial |
| 3 | 711 | 35 ms | 1.060 | 16 ms | sequencial |
| 4 | 3.315 | 137 ms | 4.549 | 69 ms | sequencial |
| 5 | 14.462 | 581 ms | 18.899 | 308 ms | **paralelo** |
| 6 | 73.301 | 2.862 ms | 77.595 | 1.249 ms | **paralelo** |
| 7 | 208.911 | 8.013 ms | 236.598 | 3.833 ms | **paralelo** |

O ganho fica perto de **2 vezes**, e não 3 ou 4, por três motivos: os ramos têm tamanhos diferentes (o ramo que vai
para a área aberta é o maior, e é ele que define o tempo total), a raiz visita mais nós sem a poda, e há o custo de
enviar o estado e receber os resultados de cada processo.

Decisões tomadas:

- **O conjunto de processos é criado uma vez e reaproveitado.** Criar processos no Windows custa cerca de 230 ms. A
  primeira versão criava um conjunto novo a cada busca, e isso deixava cada jogada 170 a 270 ms mais lenta, mesmo
  na profundidade 1 (1 ms virava 270 ms), e os testes automáticos passavam de cerca de 1 s para 134 s. Hoje só a
  primeira busca paralela paga esse custo.
- **Só a partir da profundidade 5** (constante `PROFUNDIDADE_MINIMA_PARA_PARALELIZAR`). Com o conjunto reaproveitado,
  o paralelo também seria mais rápido nas profundidades 2 a 4, mas ali a busca já leva menos de 150 ms, e preferimos
  manter a poda alfa-beta clássica, igual à do livro, justamente nas profundidades usadas para explicar o algoritmo
  (inclusive a 4, que é o padrão da página).
- **O modal da árvore usa o mesmo modo da partida.** Numa árvore de profundidade 5 ou mais, os filhos da raiz
  aparecem com α = −∞ e β = +∞ e nenhum é podado: é a perda da poda na raiz, visível na tela.
- **Os processos auxiliares ignoram o Ctrl+C** e são encerrados junto com o servidor. Se algum deles falhar, a busca é
  refeita no modo sequencial.

### 6.3 Versão experimental em C++

Para medir quanto do tempo se deve à linguagem, o projeto tem uma versão do mesmo Minimax escrita em **C++**:

- **`logica/minimax.cpp`**: o algoritmo. Mesmas regras, mesma busca em largura de território, mesmos valores
  (1000 + rodadas, −500), mesma ordem de direções, fazer/desfazer a rodada e a raiz dividida entre threads com
  `std::async` (em C++ as threads rodam de verdade em paralelo, porque não existe GIL).
- **`logica/minimax_cpp_wrapper.py`**: chama a versão em C++ a partir do Python com `ctypes` (biblioteca padrão).
  Carrega a biblioteca compilada, converte o estado e devolve um `ResultadoDaBusca`, como a versão em Python.
- **`logica/minimax_cpp_lib.so`**: a biblioteca já compilada, para Linux (x86-64).

Medições no mesmo computador, dentro do Linux (WSL), porque a biblioteca compilada é para Linux:

| Profundidade | Python sequencial | C++ (raiz em threads) | Quantas vezes mais rápido |
|---|---|---|---|
| 3 | 24 ms | 1,1 ms | ~22× |
| 4 | 90 ms | 3,2 ms | ~28× |
| 5 | 398 ms | 13 ms | ~30× |
| 6 | 1.893 ms | 60 ms | ~32× |
| 7 | não medido | 201 ms | – |

Diferenças em relação à versão em Python:

- A página **não usa** a versão em C++: ela é um experimento, e não desenha a árvore (devolve só a jogada, o valor e
  as estatísticas).
- Quando não há nenhum movimento seguro, o C++ segue para "cima", enquanto o Python segue na direção em que estava.
  As duas batem de qualquer jeito, então o valor é o mesmo; só a direção informada pode mudar.
- O C++ conta **cortes** (quantas vezes α ≥ β aconteceu), e o Python conta **ramos descartados** (um corte pode
  descartar mais de um irmão).

O teste `testes/test_minimax_cpp.py` compara as duas versões em todas as posições de 5 partidas aleatórias, com
profundidades de 1 a 3: o **valor** e a **quantidade de nós** são sempre iguais (comparando com o Python em modo paralelo, que também não poda a raiz), e a **jogada** é igual
sempre que existe um movimento seguro. No Windows esse teste é pulado, porque a biblioteca compilada é de Linux.

Para compilar de novo (Linux ou WSL, com o `g++` instalado), dentro da pasta `logica`:

```bash
g++ -shared -fPIC -O3 -std=c++11 -pthread minimax.cpp -o minimax_cpp_lib.so
```

Um detalhe importante: o arquivo compilado **não pode** se chamar `minimax.so`. No Linux e no macOS o Python trata
arquivos `.so` como módulos, e `from .minimax import ...` passaria a carregar o binário em vez do `minimax.py`: o
projeto inteiro deixava de iniciar (`ImportError`). Por isso o nome é `minimax_cpp_lib.so`.

### 6.4 Limites de profundidade

- **Para jogar: de 1 a 7.** Nas medições, cada rodada a mais multiplicou o trabalho por 2 a 4. Na profundidade 7, a
  primeira jogada leva cerca de 4 s; na 8 foram 9 s (553 mil nós), e a página não tem como cancelar uma busca em
  andamento. A versão enviada pelo colega permitia até 10, o que deixaria cada jogada com vários minutos.
- **Para desenhar a árvore: até 5.** A árvore de profundidade 5 sem poda já tem 61.212 nós; a de 6 tem 319.054,
  dezenas de megabytes de JSON para o navegador desenhar. Acima de 5 o modal mostra um aviso explicando o limite.

## 7. Onde está cada conceito no código

| Conceito | Onde está |
|---|---|
| Nó MAX (`MAX-VALUE`) | `logica/minimax.py`, `_valor_no_maximizador` |
| Nó MIN (`MIN-VALUE`) | `logica/minimax.py`, `_valor_no_minimizador` |
| Escolha da jogada na raiz | `logica/minimax.py`, `buscar_melhor_movimento` |
| Poda alfa-beta (α ≥ β) | `logica/minimax.py`, os dois `if alfa >= beta` |
| Valores de vitória, derrota e empate | `logica/minimax.py`, `_avaliar_fim_de_jogo` |
| Função de avaliação (território) | `logica/avaliacao.py`, `avaliar_posicao` e `calcular_territorios` |
| Rodada simultânea e colisões | `logica/jogo.py`, `aplicar_rodada` e `fazer_rodada_in_place` |
| Raiz em paralelo | `logica/minimax.py`, `_buscar_com_a_raiz_em_paralelo` e `_avaliar_ramo_da_raiz` |
| Labirinto aleatório e simétrico | `logica/labirinto.py`, `gerar_labirinto` |
| Árvore mostrada no modal | `logica/minimax.py`, `NoDaArvore`; `js/interface/arvore-de-decisao.js` |

## 8. O que cada parte do código faz

O algoritmo fica em Python, na pasta `logica/`, e não depende do navegador (por isso é testado com `unittest`). A
pasta `js/interface/` só cuida da tela. Não há comentários no código: os nomes das funções e variáveis foram escritos
por extenso para explicar o que fazem.

### 8.1 `logica/tabuleiro.py`

- Constantes das células: **livre**, **parede**, **rastro azul** e **rastro laranja**. O tabuleiro é um `bytearray`
  de tamanho × tamanho, compacto e rápido de copiar.
- **`DESLOCAMENTO_DE_CADA_DIRECAO`** e **`ORDEM_DAS_DIRECOES`**: as quatro direções e a ordem em que são testadas
  (cima, direita, baixo, esquerda).
- **`indice_da_celula`**, **`linha_do_indice`**, **`coluna_do_indice`**: convertem entre (linha, coluna) e a posição no vetor.
- **`tabela_de_vizinhos_por_direcao`** e **`tabela_de_vizinhos_dentro_do_tabuleiro`**: calculam uma única vez (com
  `lru_cache`) os vizinhos de cada célula. A busca consulta essas tabelas em vez de refazer contas a cada nó.
- **`vizinho_na_direcao`**: a célula vizinha numa direção, ou `FORA_DO_TABULEIRO`.
- **`indice_espelhado`**: a posição rotacionada em 180°, usada para gerar o labirinto simétrico.

### 8.2 `logica/labirinto.py`

- **`Labirinto`**: tamanho, semente, células e posições iniciais.
- **`calcular_posicoes_iniciais`**: Azul na linha do meio, perto da borda esquerda; Laranja no ponto espelhado.
- **`_sortear_paredes_simetricas`**: sorteia os segmentos de parede (com `random.Random(semente)`) e os espelha, sem
  encostar nas posições iniciais.
- **`encontrar_celulas_alcancaveis`**: BFS que encontra todas as células livres alcançáveis a partir de uma origem.
- **`_fechar_bolsoes_isolados`**: confere se os dois jogadores estão conectados e transforma em parede as áreas isoladas.
- **`gerar_labirinto(tamanho, semente)`**: junta tudo e tenta até 50 sorteios até conseguir um labirinto válido. A
  mesma semente gera sempre o mesmo labirinto, e é isso que permite o botão **Reiniciar**.

### 8.3 `logica/jogo.py`

- **`Estado`**: células, posições, trilhas, quem está vivo, rodada, últimos movimentos e pontos de colisão.
- **`criar_estado_inicial`**: monta o estado da partida a partir do labirinto.
- **`movimentos_seguros`**: direções que levam a uma célula livre.
- **`movimentos_possiveis`**: os movimentos seguros ou, se não houver nenhum, a direção atual (o agente bate).
- **`aplicar_rodada`**: aplica os dois movimentos **ao mesmo tempo**, detecta batidas e colisão frontal e devolve um
  **estado novo**, sem alterar o anterior. É usada na partida, na API e para reconstruir os nós do modal.
- **`aplicar_rodada_por_papel`**: mesma coisa, mas recebendo as jogadas como "do maximizador" e "do minimizador". É o
  que permite usar a mesma busca para o Azul e para o Laranja.
- **`ReversaoDeRodada`**, **`fazer_rodada_in_place`**, **`desfazer_rodada_in_place`** e
  **`fazer_rodada_por_papel_in_place`**: a versão "fazer/desfazer" da rodada, usada dentro do Minimax (seção 6.1).
- **`jogo_terminou`**, **`vencedor_do_jogo`**, **`descrever_causa_da_colisao`**: informam se acabou, quem venceu e por
  que cada um bateu (parede, próprio rastro, rastro do oponente, fora do tabuleiro ou colisão frontal).

### 8.4 `logica/avaliacao.py`

- **`calcular_territorios`**: a busca em largura simultânea descrita na seção 3.5. Devolve a contagem de cada
  jogador e o dono de cada célula, que também é usado para pintar o território na tela.
- **`avaliar_posicao(estado, jogador_maximizador)`**: a **função de avaliação** do Minimax: território do MAX menos
  território do MIN.
- **`calcular_distancias_a_partir_de`** e **`contar_espaco_alcancavel`**: distâncias a partir de uma célula e
  quantidade de células alcançáveis (usado pela estratégia gulosa).

### 8.5 `logica/minimax.py`: o algoritmo

- **`buscar_melhor_movimento(estado, jogador_maximizador, profundidade_em_rodadas, usar_poda_alfa_beta,
  registrar_arvore, paralelizar_a_raiz)`**: ponto de entrada. Decide se a raiz vai ser paralelizada (a partir da
  profundidade 5, pela função `deve_paralelizar_a_raiz`, e só quando há mais de um movimento possível), roda a busca e
  devolve um `ResultadoDaBusca` com a melhor jogada, o valor, os nós visitados, os ramos podados, o tempo e, se
  pedido, a árvore completa.
- **`_valor_no_maximizador`**: o nó MAX (equivale ao `MAX-VALUE` do livro):
  1. se o jogo acabou, devolve o valor de vitória, derrota ou empate (`_avaliar_fim_de_jogo`);
  2. se chegou ao limite de profundidade, devolve a avaliação de território (`avaliar_posicao`);
  3. senão, testa cada movimento do MAX chamando `_valor_no_minimizador` e fica com o **maior** valor;
  4. com poda ligada, atualiza **α** e interrompe o laço quando **α ≥ β**.
- **`_valor_no_minimizador`**: o nó MIN (`MIN-VALUE`). Para cada resposta do MIN, faz a rodada completa no estado,
  chama `_valor_no_maximizador` com uma rodada a menos e desfaz a rodada. Fica com o **menor** valor e, com poda,
  atualiza **β** e corta quando **α ≥ β**.
- **`_avaliar_fim_de_jogo`**: os valores de vitória (1000 + rodadas restantes), derrota e empate (−500).
- **Raiz em paralelo** (seção 6.2):
  - **`RamoDaRaiz`** e **`ResultadoDoRamoDaRaiz`**: o que é enviado para cada processo (estado, jogador, movimento,
    profundidade) e o que volta (valor, nós, podas e o pedaço da árvore);
  - **`_avaliar_ramo_da_raiz`**: roda dentro do processo auxiliar e calcula o nó MIN de um movimento da raiz;
  - **`_buscar_com_a_raiz_em_paralelo`**: distribui os ramos, junta os resultados e escolhe o maior valor;
  - **`_obter_executor_de_processos`**, **`_descartar_executor_com_defeito`** e
    **`_ignorar_ctrl_c_nos_processos_auxiliares`**: criam uma única vez o conjunto de processos, trocam por um novo
    se ele falhar e fazem os processos ignorarem o Ctrl+C.
- **Registro da árvore** (`NoDaArvore`, `_criar_no_filho`, `_registrar_ramos_podados`, `_concluir_no_interno`,
  `_classificar_valor`): quando `registrar_arvore` está ligado, cada nó guarda tipo (MAX/MIN), jogada, janela
  alfa-beta na entrada, valor, se o valor é exato ou um limite (≤ / ≥), qual filho foi o melhor, se foi podado e, nas
  folhas, a avaliação de território. Sem essa opção nada é registrado e a busca fica mais leve.
- **`obter_caminho_principal`**: segue o melhor filho de cada nó a partir da raiz. É a sequência de jogadas que o
  Minimax espera que aconteça (em dourado no modal).

### 8.6 `logica/minimax.cpp` e `logica/minimax_cpp_wrapper.py`

A versão experimental em C++ e a ponte que a chama a partir do Python (seção 6.3):

- **`minimax.cpp`**: `valor_no_maximizador` e `valor_no_minimizador` (a mesma recursão com poda),
  `calcular_territorios` (a mesma busca em largura), `fazer_rodada` e `desfazer_rodada`, e a função exportada
  `buscar_melhor_movimento_cpp`, que dispara uma thread por movimento da raiz.
- **`minimax_cpp_wrapper.py`**: `carregar_biblioteca_cpp` (carrega a biblioteca uma única vez e avisa com o comando
  de compilação se ela não existir) e `buscar_melhor_movimento_cpp` (mesma interface da versão em Python, sem árvore).

### 8.7 `logica/estrategias.py`

- **`ConfiguracaoDoAgente`** e **`DecisaoDoAgente`**: o que cada agente recebe (estratégia, profundidade, poda) e o
  que devolve (jogada e estatísticas).
- **Minimax** (`_decidir_com_minimax`): chama `buscar_melhor_movimento` com a profundidade configurada.
- **Guloso** (`_decidir_com_estrategia_gulosa`): escolhe a direção que deixa mais células alcançáveis logo em
  seguida, sem pensar no oponente. Serve de comparação.
- **Aleatório** (`_decidir_aleatoriamente`): sorteia entre as direções seguras.
- **`ESTRATEGIAS`** e **`decidir_movimento`**: a lista de estratégias e a função que chama a estratégia configurada.

### 8.8 `logica/partida.py`

- **`jogar_rodada`**: pede a decisão dos dois agentes **sobre o mesmo estado**, aplica a rodada e devolve um
  `RegistroDaRodada` com o estado antes e depois, as decisões e as causas das batidas.
- **`criar_gerador_da_rodada`**: gera números aleatórios a partir da semente da partida e do número da rodada, para
  o agente aleatório ser reproduzível mesmo com o servidor sem guardar nada entre um pedido e outro.
- **`simular_partida_completa`**: joga uma partida inteira sem interface (usada nos testes e nas medições da seção 9).
- **`reconstruir_arvore_de_decisao`** e **`reconstruir_estado_do_no`**: refazem a busca com a árvore registrada e o
  tabuleiro de um nó da árvore, para o modal.

### 8.9 `logica/api.py`

A ponte entre o Python e o navegador:

- **`estado_para_json`** / **`estado_de_json`**, **`territorios_para_json`**, **`decisao_para_json`** e
  **`no_para_json`**: convertem os objetos Python para JSON e de volta. Os valores ±∞ de α e β viram `null`, porque
  JSON não aceita infinito.
- **`configuracao_do_agente_de_json`**: valida a estratégia e a profundidade (1 a 7) recebidas da página.
- **`montar_arvore_de_decisao`**: recusa, com uma mensagem clara, árvores acima da profundidade 5.
- **Rotas** (`ROTAS_DA_API`): `/api/configuracao` (estratégias e constantes do jogo), `/api/nova-partida`,
  `/api/jogar-rodada`, `/api/arvore` e `/api/estado-do-no`.
- O servidor não guarda o estado da partida: a página envia o estado atual em cada pedido e recebe o próximo.

### 8.10 `servidor.py`

- **`ManipuladorDeRequisicoes`**: estende o `SimpleHTTPRequestHandler` da biblioteca padrão. Entrega os arquivos da
  página e trata os `POST` da API, respondendo com erro 400 e uma mensagem clara quando o pedido é inválido.
- Dois ajustes deixaram cada pedido cerca de 100 vezes mais rápido no Windows (de 60–250 ms para 2–3 ms):
  **`TCP_NODELAY`** com conexões persistentes (HTTP/1.1), para o sistema não segurar a resposta esperando mais
  dados, e escutar também no endereço IPv6 local (`::1`), que é o primeiro que o navegador tenta ao abrir
  `localhost`. Os dois endereços são locais (`127.0.0.1` e `::1`), então a página não fica acessível pela rede.
- **`escolher_porta`**: usa a porta passada na linha de comando (padrão 8000).
- O `if __name__ == "__main__"` no fim do arquivo é obrigatório por causa do paralelismo: no Windows, cada processo
  auxiliar importa o módulo principal de novo, e sem essa proteção cada um tentaria abrir outro servidor.

### 8.11 `js/interface/` (só a tela)

- **`aplicacao.js`**: controlador da página. Lê a configuração, pede cada rodada ao Python (`/api/jogar-rodada`),
  controla **Resolver/Pausar**, **Próximo passo**, **Reiniciar** e **Resetar**, a **velocidade** (espera o tempo que
  falta para completar o intervalo `1000 / passos por segundo` depois de cada resposta), o placar, o resultado final,
  a tabela da última decisão, a lista de acompanhamento e os atalhos de teclado.
- **`api.js`**: envia os pedidos ao servidor e transforma respostas de erro em mensagens na tela.
- **`desenho-do-tabuleiro.js`**: desenha o estado no `<canvas>`: grade, território, paredes, as **trilhas de luz**,
  as cabeças, o movimento pendente (tracejado, na prévia dos nós MIN) e um X vermelho onde houve batida.
- **`arvore-de-decisao.js`**: o modal da árvore. Posiciona os nós visíveis (`calcularLayout`), desenha em SVG (MAX
  como retângulo, MIN como pílula, caminho escolhido em dourado, ramos podados tracejados), expande e recolhe ramos,
  dá zoom e explica o nó selecionado (`montarDescricaoDoNo`), buscando no Python o tabuleiro daquele nó.
- **`formatacao.js`** e **`tabuleiro.js`**: formatação de números e valores ("vitória", "empate", "+12"), setas das
  jogadas e as constantes usadas no desenho.
- **`index.html`** e **`estilos.css`**: estrutura da página e tema escuro estilo Tron, com layout que funciona também
  no celular.

### 8.12 `testes/`

33 testes com `unittest`:

- **Labirinto**: mesma semente gera o mesmo labirinto; sementes diferentes geram labirintos diferentes; o labirinto é
  simétrico; todas as células livres são alcançáveis.
- **Regras**: movimentos seguros, colisão frontal, causa de cada batida, imutabilidade do `aplicar_rodada`, ordem das
  trilhas e **fazer/desfazer a rodada devolvendo exatamente o estado original**.
- **Avaliação**: dono de cada célula, troca de sinal conforme o ponto de vista e equivalência da busca simultânea
  com a comparação das distâncias de cada jogador.
- **Minimax**: evita o beco sem saída; enxerga a derrota com 2 rodadas; só reconhece a vitória quando ela está
  dentro da profundidade; empate inevitável vale −500; **a poda alfa-beta dá o mesmo valor e a mesma jogada que o
  Minimax puro** em dezenas de posições; a árvore registrada bate com as estatísticas da busca.
- **Raiz em paralelo**: só paraleliza a partir da profundidade 5; dá **a mesma jogada e o mesmo valor que a busca
  sequencial**; a árvore paralela é coerente e não tem poda na raiz.
- **Versão em C++**: mesmo valor, mesma quantidade de nós e mesma jogada que o Python (pulado no Windows).
- **Partidas e API**: partidas sempre terminam com um resultado válido; o Minimax mais profundo vence o mais raso na
  maioria dos labirintos; as respostas da API são JSON válido; a árvore acima da profundidade 5 é recusada.

## 9. Resultados

Partidas automáticas em labirintos 17 × 17 diferentes, com a versão em Python. Cada confronto foi jogado dos dois
lados, para descontar qualquer vantagem de posição:

| Azul | Laranja | Labirintos | Vitórias do Azul | Vitórias do Laranja | Empates |
|---|---|---|---|---|---|
| Minimax, 3 rodadas | Minimax, 1 rodada | 60 | 47 | 11 | 2 |
| Minimax, 1 rodada | Minimax, 3 rodadas | 60 | 6 | 52 | 2 |
| Minimax, 4 rodadas | Minimax, 2 rodadas | 60 | 33 | 24 | 3 |
| Minimax, 2 rodadas | Minimax, 4 rodadas | 60 | 17 | 41 | 2 |
| Minimax, 4 rodadas | Minimax, 1 rodada | 20 | 16 | 4 | 0 |
| Minimax, 1 rodada | Minimax, 4 rodadas | 20 | 6 | 14 | 0 |
| Minimax, 4 rodadas | Guloso | 20 | 19 | 1 | 0 |
| Minimax, 3 rodadas | Minimax, 3 rodadas | 20 | 10 | 10 | 0 |

- **Enxergar mais longe faz diferença**: somando os dois lados, profundidade 3 contra 1 venceu 99 de 120 partidas
  (83%), e profundidade 4 contra 1 venceu 30 de 40 (75%).
- **A vantagem diminui quando o adversário também enxerga longe**: profundidade 4 contra 2 venceu 74 de 120 (62%).
- **Contra o agente guloso**, que não considera o oponente, o Minimax venceu 19 de 20.
- **Com profundidades iguais** o jogo fica equilibrado (10 × 10), como esperado num labirinto simétrico.
- **Cuidado com amostras pequenas**: numa primeira rodada de 20 partidas, a profundidade 4 perdeu para a 2 (7 × 12).
  Com 60 partidas de cada lado, o resultado se inverteu. Vinte partidas eram poucas para tirar conclusões.
- **Desempenho**: uma decisão com profundidade 4 e poda leva cerca de 140 ms no início da partida e bem menos depois,
  quando sobra menos espaço livre. Na velocidade máxima, a página chegou a cerca de 29 rodadas por segundo. As
  profundidades 5 a 7 usam a raiz em paralelo (seção 6.2).

## 10. Decisões de projeto e limitações

- **Heurística**: a contagem de território não considera que algumas áreas não podem ser percorridas por inteiro
  (becos com entrada e saída pela mesma célula). Uma melhoria seria estimar o maior caminho possível em cada região.
- **Horizonte limitado**: com profundidade pequena, o agente pode não perceber uma armadilha que só se fecha além do
  que ele enxerga (o "efeito horizonte"). Aumentar a profundidade reduz esse problema, mas o custo cresce exponencialmente.
- **Ordem das jogadas**: as direções são testadas sempre na mesma ordem (cima, direita, baixo, esquerda). Testar
  primeiro as jogadas mais promissoras aumentaria o número de podas (seção 4.2).
- **Adversário pessimista**: supor que o oponente vê a jogada antes de responder deixa o agente mais cauteloso do
  que o necessário contra adversários fracos, mas é o que garante a segurança da decisão.
- **Python no servidor, interface no navegador**: o algoritmo ficou em Python e a tela em HTML/JavaScript, ligados
  por uma API JSON simples. O servidor não guarda estado, o que facilita os testes e permite abrir várias abas ao
  mesmo tempo. O custo é enviar o tabuleiro em cada pedido, algo pequeno (menos de 1.000 números).
- **Velocidade do Python**: Python é mais lento que C++ para esse tipo de laço (cerca de 30 vezes, seção 6.3). Por
  isso a avaliação usa uma única busca em largura e tabelas de vizinhos pré-calculadas, e as profundidades maiores
  dividem a raiz entre processos. A versão em C++ mostra o ganho possível, mas ficou fora da página para o projeto
  continuar rodando só com Python, em qualquer sistema, sem compilar nada.

## 11. Perguntas que o professor pode fazer

**Por que usar Minimax se no Tron os dois jogam ao mesmo tempo?**
Porque cada rodada foi dividida em dois turnos: o Azul escolhe, o Laranja responde conhecendo a escolha, e só então as
duas jogadas são aplicadas juntas (seção 3.2). Isso dá ao Laranja uma vantagem que ele não tem no jogo real, então o
valor calculado é uma garantia pessimista: na partida de verdade o Azul só pode se sair igual ou melhor.

**A poda alfa-beta pode mudar a jogada escolhida?**
Não. Ela só deixa de calcular ramos que comprovadamente não podem mudar o valor da raiz (seção 4.2). Um teste
automático compara Minimax puro e com poda em dezenas de posições e profundidades: valor e jogada são sempre iguais.
O que muda é a quantidade de nós visitados (de 29% a 76% menos).

**Qual é a complexidade do algoritmo?**
Com fator de ramificação *b* (até 3 aqui) e *d* níveis (2 por rodada), o Minimax visita O(*b*ᵈ) nós. Com a poda, no
melhor caso, O(*b*ᵈ⸍²). Nas medições, cada rodada a mais multiplicou o tempo por 2 a 4 (seção 6.4).

**O que é a função de avaliação e por que ela funciona?**
É a nota dada às folhas que não são fim de jogo: células que o Azul alcança primeiro menos células que o Laranja
alcança primeiro (seção 3.5). Funciona porque, no Tron, quem tem mais espaço livre consegue andar por mais tempo sem
bater e, no fim, sobrevive ao outro.

**Por que a vitória vale 1000 + rodadas restantes, e o empate −500?**
O 1000 é maior que qualquer diferença de território, então vencer sempre vale mais que qualquer posição boa. As
rodadas restantes fazem o agente preferir vencer mais cedo e, se for perder, perder mais tarde. O empate em −500 evita
que o agente bata de frente de propósito para escapar de uma posição só um pouco pior (seção 3.4).

**O que é o efeito horizonte?**
É não enxergar um perigo que acontece depois do limite de profundidade. Com profundidade 1, o Azul pode entrar num
corredor que parece grande mas que o Laranja fecha duas rodadas depois. Aumentar a profundidade diminui o problema,
e é por isso que profundidades maiores vencem mais (seção 9).

**Por que paralelizar só a raiz? E por que processos, e não threads?**
Dividir pela raiz é a forma mais simples: cada movimento do Azul é uma subárvore independente. Threads não ajudariam
em Python, porque o GIL só deixa uma thread executar código Python por vez; processos têm cada um o seu
interpretador. O custo é perder a poda na raiz (seção 6.2).

**A versão paralela escolhe a mesma jogada?**
Sim. Cada ramo da raiz é calculado com a janela completa (α = −∞, β = +∞), então os valores da raiz são exatos, e a
raiz escolhe o maior do mesmo jeito. Os testes comparam as duas versões. Só a contagem de nós muda.

**Para que serve a versão em C++ se a página não usa?**
Para medir o custo da linguagem: o mesmo algoritmo, com as mesmas decisões (conferidas por teste), fica cerca de 30
vezes mais rápido. A profundidade 7 levou 0,2 s em C++, contra cerca de 4 s no Python com a raiz em paralelo. Ela
ficou fora da página porque precisaria ser compilada para cada sistema.

**O Azul sempre ganha?**
Não. O Minimax garante a melhor jogada **dentro do que ele enxerga** e com a heurística que tem. Num labirinto
simétrico com dois agentes iguais, o resultado fica em 10 × 10 (seção 9). A vantagem aparece quando ele enxerga mais
longe que o adversário ou quando o adversário não pensa no oponente (guloso).

**Por que o labirinto é simétrico?**
Para a partida ser justa: com rotação de 180°, os dois começam exatamente na mesma situação, então a diferença de
resultado vem das decisões, e não da sorte do sorteio.

## 12. Roteiro sugerido para a apresentação

1. Mostre o labirinto e clique em **Resetar** algumas vezes para mostrar que ele muda (e que é simétrico).
2. Ligue **Mostrar território** e explique que a cor de cada célula é a função de avaliação.
3. Clique em **Próximo passo** algumas vezes e abra **Ver árvore de decisão**: raiz MAX, filhos MIN, caminho
   dourado, folhas com a conta de território e ramos podados.
4. Clique num nó MIN e depois numa folha para mostrar o tabuleiro de cada momento e a explicação do valor.
5. Clique em **Resolver**, acelere e desacelere, e pause no momento em que um agente cerca o outro.
6. Desligue a **poda alfa-beta**, jogue uma rodada e compare os nós visitados: mesma jogada, muito mais trabalho.
7. Use **Reiniciar** com profundidades diferentes para mostrar que enxergar mais longe muda o resultado.
8. Coloque o Azul na profundidade 5, jogue uma rodada e abra a árvore: os filhos da raiz aparecem sem poda, porque
   foram calculados em paralelo (seção 6.2).
