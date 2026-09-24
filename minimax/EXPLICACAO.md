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

### 1.1 Como o projeto está organizado

- **Python (pasta `logica/`)**: todo o algoritmo. O Minimax, a poda alfa-beta, a função de avaliação, as regras do
  jogo, a geração do labirinto e os agentes de comparação.
- **Servidor (`servidor.py`)**: um servidor HTTP da biblioteca padrão do Python que entrega a página e responde aos
  pedidos dela em JSON (nova partida, próxima rodada, árvore de decisão e tabuleiro de um nó da árvore).
- **Navegador (`index.html`, `estilos.css` e `js/interface/`)**: só a interface. Desenha o tabuleiro e a árvore,
  controla a velocidade e os botões, e pede ao Python cada jogada. Nenhuma decisão é calculada em JavaScript.

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

1. Uma **busca em largura (BFS)** parte das duas cabeças **ao mesmo tempo**, camada por camada: primeiro as
   células a 1 passo de cada jogador, depois as a 2 passos, e assim por diante.
2. Cada célula livre pertence a **quem chega nela primeiro**. Se os dois chegam na mesma camada, ela é disputada e
   não conta para ninguém. Células que ninguém alcança também não contam.
3. **Valor = células do Azul − células do Laranja.**

Fazer uma única busca simultânea, em vez de uma busca para cada jogador seguida da comparação das distâncias, deixou
a avaliação cerca de duas vezes mais rápida em Python. Um dos testes automatizados confere, em centenas de posições,
que as duas formas dão exatamente o mesmo resultado.

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

Números medidos em Python na posição inicial de um labirinto 17 × 17 (semente 7). Nos cinco casos, o Minimax puro
e a versão com poda escolheram a mesma jogada, com o mesmo valor:

| Profundidade | Nós (Minimax puro) | Nós (alfa-beta) | Redução | Tempo puro | Tempo alfa-beta |
|---|---|---|---|---|---|
| 1 rodada | 21 | 15 | 29% | 2 ms | 1 ms |
| 2 rodadas | 213 | 107 | 50% | 12 ms | 5 ms |
| 3 rodadas | 1.858 | 711 | 62% | 103 ms | 35 ms |
| 4 rodadas | 10.482 | 3.315 | 68% | 512 ms | 149 ms |
| 5 rodadas | 61.212 | 14.462 | 76% | 3.057 ms | 640 ms |

Quanto mais profunda a árvore, maior a economia. Sem a poda, a profundidade 5 levaria cerca de 3 segundos por
jogada, o que travaria a animação.

Com a poda, alguns valores da árvore deixam de ser exatos e passam a ser **limites**: `≤ 12` quer dizer "no máximo
12, e isso já basta para descartar este ramo"; `≥ 12` quer dizer "pelo menos 12". O modal da árvore mostra esses
símbolos e os ramos podados tracejados. Os valores do caminho escolhido são sempre exatos.

### 2.8 Como o Minimax entra em cada rodada da partida

A cada rodada, o navegador envia ao servidor Python a situação atual do jogo e a configuração dos agentes
(rota `/api/jogar-rodada`). O Python então:

1. Roda o Minimax do Azul **a partir da situação atual** e pega a direção de maior valor.
2. O Laranja escolhe a jogada dele com a estratégia configurada. Se for Minimax, ele roda a **mesma função** com os
   papéis trocados: para ele, o Laranja é o MAX e o Azul é o MIN.
3. Aplica as duas jogadas juntas e devolve o novo estado, as decisões (jogada, valor, nós visitados, podas e
   tempo), a causa de uma eventual batida e o território de cada um.

A árvore não é guardada durante a partida (seria muita memória). Quando o usuário abre o modal, o navegador pede ao
Python (rota `/api/arvore`) que refaça a busca daquela rodada com a opção `registrar_arvore` ligada. Como a busca é
determinística, a árvore mostrada é idêntica à que gerou a decisão. Ao clicar num nó, o navegador pede o tabuleiro
daquele momento (rota `/api/estado-do-no`), que o Python reconstrói reaplicando as jogadas do caminho.

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

O algoritmo fica em Python, na pasta `logica/`, e não depende do navegador (por isso é testado com `unittest`). A
pasta `js/interface/` só cuida da tela. Não há comentários no código: os nomes das funções e variáveis foram escritos
por extenso para explicar o que fazem.

### 4.1 `logica/tabuleiro.py`

- Constantes das células: **livre**, **parede**, **rastro azul** e **rastro laranja**. O tabuleiro é um `bytearray`
  de tamanho × tamanho, compacto e rápido de copiar.
- **`DESLOCAMENTO_DE_CADA_DIRECAO`** e **`ORDEM_DAS_DIRECOES`**: as quatro direções e a ordem em que são testadas.
- **`indice_da_celula`**, **`linha_do_indice`**, **`coluna_do_indice`**: convertem entre (linha, coluna) e a posição no vetor.
- **`tabela_de_vizinhos_por_direcao`** e **`tabela_de_vizinhos_dentro_do_tabuleiro`**: calculam uma única vez (com
  `lru_cache`) os vizinhos de cada célula. A busca consulta essas tabelas em vez de refazer contas a cada nó.
- **`vizinho_na_direcao`**: a célula vizinha numa direção, ou `FORA_DO_TABULEIRO`.
- **`indice_espelhado`**: a posição rotacionada em 180°, usada para gerar o labirinto simétrico.

### 4.2 `logica/labirinto.py`

- **`Labirinto`**: tamanho, semente, células e posições iniciais.
- **`calcular_posicoes_iniciais`**: Azul na linha do meio, perto da borda esquerda; Laranja no ponto espelhado.
- **`_sortear_paredes_simetricas`**: sorteia os segmentos de parede (com `random.Random(semente)`) e os espelha, sem
  encostar nas posições iniciais.
- **`encontrar_celulas_alcancaveis`**: BFS que encontra todas as células livres alcançáveis a partir de uma origem.
- **`_fechar_bolsoes_isolados`**: confere se os dois jogadores estão conectados e transforma em parede as áreas isoladas.
- **`gerar_labirinto(tamanho, semente)`**: junta tudo e tenta até 50 sorteios até conseguir um labirinto válido. A
  mesma semente gera sempre o mesmo labirinto, e é isso que permite o botão **Reiniciar**.

### 4.3 `logica/jogo.py`

- **`Estado`**: células, posições, trilhas, quem está vivo, rodada, últimos movimentos e pontos de colisão.
- **`criar_estado_inicial`**: monta o estado da partida a partir do labirinto.
- **`movimentos_seguros`**: direções que levam a uma célula livre.
- **`movimentos_possiveis`**: os movimentos seguros ou, se não houver nenhum, a direção atual (o agente bate).
- **`aplicar_rodada`**: aplica os dois movimentos **ao mesmo tempo**, detecta batidas e colisão frontal e devolve um
  **estado novo**, sem alterar o anterior. Essa imutabilidade é o que permite ao Minimax explorar vários futuros a
  partir do mesmo estado sem precisar "desfazer" jogadas.
- **`aplicar_rodada_por_papel`**: mesma coisa, mas recebendo as jogadas como "do maximizador" e "do minimizador". É o
  que permite usar a mesma busca para o Azul e para o Laranja.
- **`jogo_terminou`**, **`vencedor_do_jogo`**, **`descrever_causa_da_colisao`**: informam se acabou, quem venceu e por
  que cada um bateu (parede, próprio rastro, rastro do oponente, fora do tabuleiro ou colisão frontal).

### 4.4 `logica/avaliacao.py`

- **`calcular_territorios`**: a busca em largura simultânea descrita na seção 2.5. Devolve a contagem de cada
  jogador e o dono de cada célula, que também é usado para pintar o território na tela.
- **`avaliar_posicao(estado, jogador_maximizador)`**: a **função de avaliação** do Minimax: território do MAX menos
  território do MIN.
- **`calcular_distancias_a_partir_de`** e **`contar_espaco_alcancavel`**: distâncias a partir de uma célula e
  quantidade de células alcançáveis (usado pela estratégia gulosa).

### 4.5 `logica/minimax.py`: o algoritmo

- **`buscar_melhor_movimento(estado, jogador_maximizador, profundidade_em_rodadas, usar_poda_alfa_beta,
  registrar_arvore)`**: ponto de entrada. Devolve um `ResultadoDaBusca` com a melhor jogada, o valor, os nós
  visitados, os ramos podados, o tempo e, se pedido, a árvore completa.
- **`_valor_no_maximizador`**: o nó MAX (equivale ao `MAX-VALUE` do livro de Russell e Norvig):
  1. se o jogo acabou, devolve o valor de vitória, derrota ou empate (`_avaliar_fim_de_jogo`);
  2. se chegou ao limite de profundidade, devolve a avaliação de território (`avaliar_posicao`);
  3. senão, testa cada movimento do MAX chamando `_valor_no_minimizador` e fica com o **maior** valor;
  4. com poda ligada, atualiza **α** e interrompe o laço quando **α ≥ β**.
- **`_valor_no_minimizador`**: o nó MIN (`MIN-VALUE`). Para cada resposta do MIN, aplica a rodada completa e chama
  `_valor_no_maximizador` com uma rodada a menos. Fica com o **menor** valor e, com poda, atualiza **β** e corta
  quando **α ≥ β**.
- **`_avaliar_fim_de_jogo`**: os valores de vitória (1000 + rodadas restantes), derrota e empate (−500).
- **Registro da árvore** (`NoDaArvore`, `_criar_no_filho`, `_registrar_ramos_podados`, `_concluir_no_interno`,
  `_classificar_valor`): quando `registrar_arvore` está ligado, cada nó guarda tipo (MAX/MIN), jogada, janela
  alfa-beta na entrada, valor, se o valor é exato ou um limite (≤ / ≥), qual filho foi o melhor, se foi podado e, nas
  folhas, a avaliação de território. Sem essa opção nada é registrado e a busca fica mais leve.
- **`obter_caminho_principal`**: segue o melhor filho de cada nó a partir da raiz. É a sequência de jogadas que o
  Minimax espera que aconteça (em dourado no modal).

### 4.6 `logica/estrategias.py`

- **`ConfiguracaoDoAgente`** e **`DecisaoDoAgente`**: o que cada agente recebe (estratégia, profundidade, poda) e o
  que devolve (jogada e estatísticas).
- **Minimax** (`_decidir_com_minimax`): chama `buscar_melhor_movimento` com a profundidade configurada.
- **Guloso** (`_decidir_com_estrategia_gulosa`): escolhe a direção que deixa mais células alcançáveis logo em
  seguida, sem pensar no oponente. Serve de comparação.
- **Aleatório** (`_decidir_aleatoriamente`): sorteia entre as direções seguras.
- **`ESTRATEGIAS`** e **`decidir_movimento`**: a lista de estratégias e a função que chama a estratégia configurada.

### 4.7 `logica/partida.py`

- **`jogar_rodada`**: pede a decisão dos dois agentes **sobre o mesmo estado**, aplica a rodada e devolve um
  `RegistroDaRodada` com o estado antes e depois, as decisões e as causas das batidas.
- **`criar_gerador_da_rodada`**: gera números aleatórios a partir da semente da partida e do número da rodada, para
  o agente aleatório ser reproduzível mesmo com o servidor sem guardar nada entre um pedido e outro.
- **`simular_partida_completa`**: joga uma partida inteira sem interface (usada nos testes e nas medições da seção 5).
- **`reconstruir_arvore_de_decisao`** e **`reconstruir_estado_do_no`**: refazem a busca com a árvore registrada e o
  tabuleiro de um nó da árvore, para o modal.

### 4.8 `logica/api.py`

A ponte entre o Python e o navegador:

- **`estado_para_json`** / **`estado_de_json`**, **`territorios_para_json`**, **`decisao_para_json`** e
  **`no_para_json`**: convertem os objetos Python para JSON e de volta. Os valores ±∞ de α e β viram `null`, porque
  JSON não aceita infinito.
- **`configuracao_do_agente_de_json`**: valida a estratégia e a profundidade (1 a 5) recebidas da página.
- **Rotas** (`ROTAS_DA_API`): `/api/configuracao` (estratégias e constantes do jogo), `/api/nova-partida`,
  `/api/jogar-rodada`, `/api/arvore` e `/api/estado-do-no`.
- O servidor não guarda o estado da partida: a página envia o estado atual em cada pedido e recebe o próximo.

### 4.9 `servidor.py`

- **`ManipuladorDeRequisicoes`**: estende o `SimpleHTTPRequestHandler` da biblioteca padrão. Entrega os arquivos da
  página e trata os `POST` da API, respondendo com erro 400 e uma mensagem clara quando o pedido é inválido.
- Dois ajustes deixaram cada pedido cerca de 100 vezes mais rápido no Windows (de 60–250 ms para 2–3 ms):
  **`TCP_NODELAY`** com conexões persistentes (HTTP/1.1), para o sistema não segurar a resposta esperando mais
  dados, e escutar também no endereço IPv6 local (`::1`), que é o primeiro que o navegador tenta ao abrir
  `localhost`. Os dois endereços são locais (`127.0.0.1` e `::1`), então a página não fica acessível pela rede.
- **`escolher_porta`**: usa a porta passada na linha de comando (padrão 8000).

### 4.10 `js/interface/` (só a tela)

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

### 4.11 `testes/`

27 testes com `unittest`:

- **Labirinto**: mesma semente gera o mesmo labirinto; sementes diferentes geram labirintos diferentes; o labirinto é
  simétrico; todas as células livres são alcançáveis.
- **Regras**: movimentos seguros, colisão frontal, causa de cada batida, imutabilidade do estado, ordem das trilhas.
- **Avaliação**: dono de cada célula, troca de sinal conforme o ponto de vista e equivalência da busca simultânea
  com a comparação das distâncias de cada jogador.
- **Minimax**: evita o beco sem saída; enxerga a derrota com 2 rodadas; só reconhece a vitória quando ela está
  dentro da profundidade; empate inevitável vale −500; **a poda alfa-beta dá o mesmo valor e a mesma jogada que o
  Minimax puro** em dezenas de posições; a árvore registrada bate com as estatísticas da busca.
- **Partidas e API**: partidas sempre terminam com um resultado válido; o Minimax mais profundo vence o mais raso na
  maioria dos labirintos; as respostas da API são JSON válido.

## 5. Resultados

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
- **Desempenho**: em Python, uma decisão com profundidade 4 e poda leva cerca de 150 ms no início da partida e bem
  menos depois, quando sobra menos espaço livre. Na velocidade máxima, a página chegou a cerca de 29 rodadas por
  segundo.

## 6. Decisões de projeto e limitações

- **Heurística**: a contagem de território não considera que algumas áreas não podem ser percorridas por inteiro
  (becos com entrada e saída pela mesma célula). Uma melhoria seria estimar o maior caminho possível em cada região.
- **Horizonte limitado**: com profundidade pequena, o agente pode não perceber uma armadilha que só se fecha além do
  que ele enxerga (o "efeito horizonte"). Aumentar a profundidade reduz esse problema, mas o custo cresce exponencialmente.
- **Ordem das jogadas**: as direções são testadas sempre na mesma ordem (cima, direita, baixo, esquerda). Testar
  primeiro as jogadas mais promissoras aumentaria o número de podas.
- **Adversário pessimista**: supor que o oponente vê a jogada antes de responder deixa o agente mais cauteloso do
  que o necessário contra adversários fracos, mas é o que garante a segurança da decisão.
- **Python no servidor, interface no navegador**: o algoritmo ficou em Python e a tela em HTML/JavaScript, ligados
  por uma API JSON simples. O servidor não guarda estado, o que facilita os testes e permite abrir várias abas ao
  mesmo tempo. O custo é enviar o tabuleiro em cada pedido, algo pequeno (menos de 1.000 números).
- **Velocidade do Python**: Python é mais lento que JavaScript para esse tipo de laço. Por isso a avaliação usa uma
  única busca em largura e tabelas de vizinhos pré-calculadas. Sem poda, a profundidade 5 leva segundos por jogada.

## 7. Roteiro sugerido para a apresentação

1. Mostre o labirinto e clique em **Resetar** algumas vezes para mostrar que ele muda (e que é simétrico).
2. Ligue **Mostrar território** e explique que a cor de cada célula é a função de avaliação.
3. Clique em **Próximo passo** algumas vezes e abra **Ver árvore de decisão**: raiz MAX, filhos MIN, caminho
   dourado, folhas com a conta de território e ramos podados.
4. Clique num nó MIN e depois numa folha para mostrar o tabuleiro de cada momento e a explicação do valor.
5. Clique em **Resolver**, acelere e desacelere, e pause no momento em que um agente cerca o outro.
6. Desligue a **poda alfa-beta**, jogue uma rodada e compare os nós visitados: mesma jogada, muito mais trabalho.
7. Use **Reiniciar** com profundidades diferentes para mostrar que enxergar mais longe muda o resultado.
