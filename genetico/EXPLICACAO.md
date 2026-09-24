# Explicação: Caixeiro Viajante com algoritmo genético

Este texto foi escrito para quem vai **explicar** o projeto. A seção 0 resume tudo em um minuto. As seções 1 a 4
explicam o problema e o algoritmo, com um exemplo real tirado do código. A seção 6 percorre o código arquivo por
arquivo, e as seções 8 e 9 trazem perguntas que o professor pode fazer e um roteiro para a apresentação.

## 0. Resumo em um minuto

- **Problema**: encontrar a rota mais curta que passa por todas as cidades uma única vez e volta à primeira (o
  Problema do Caixeiro Viajante). As cidades ficam num mapa real e a distância é a distância real sobre a Terra.
- **Por que não testar todas as rotas**: com as 27 capitais existem cerca de 2 × 10²⁶ rotas diferentes.
- **Algoritmo**: um **algoritmo genético**. Cada rota é um "indivíduo"; uma população de 120 rotas evolui por
  **seleção** (torneio), **cruzamento** (Order Crossover) e **mutação** (inversão de um trecho). As rotas mais
  curtas têm mais chance de passar seus pedaços adiante.
- **Garantias**: as 2 melhores rotas passam direto para a geração seguinte (elitismo), então a melhor rota **nunca
  piora**. O algoritmo para depois de 800 gerações seguidas sem melhora.
- **Resultado**: com as 27 capitais, a melhor rota da população inicial tem cerca de 37.000 km; o algoritmo chega a
  cerca de 13.900 km em média (63% menor), e encontrou a melhor rota conhecida, de 13.790 km, em 6 de 10 execuções.
  Cada geração leva cerca de 1,5 ms.

## 1. O problema

Um vendedor precisa visitar todas as cidades de uma lista **uma única vez** e voltar à cidade de partida,
percorrendo a **menor distância possível**. Parece simples, mas o número de rotas possíveis explode: com n cidades
existem (n − 1)! / 2 rotas diferentes (fixando a cidade de partida e contando só uma vez cada rota e o seu
caminho inverso).

| Cidades | Rotas diferentes | Testar todas |
|---|---|---|
| 8 | 2.520 | instantâneo |
| 15 | cerca de 44 bilhões | horas ou dias |
| 27 (capitais) | cerca de 2 × 10²⁶ | bilhões de anos |

É um problema **NP-difícil**: não se conhece nenhum método que ache a rota ótima rapidamente para qualquer número
de cidades. Por isso se usam **meta-heurísticas**, métodos que encontram rotas muito boas em pouco tempo, sem
garantia de achar a ótima. O algoritmo genético é uma delas.

Neste projeto os pontos ficam num **mapa real** (OpenStreetMap, com a biblioteca Leaflet) e a distância entre duas
cidades é a **distância real em linha reta** sobre a superfície da Terra, calculada pela **fórmula de Haversine**
(seção 3.8) a partir da latitude e da longitude.

### 1.1 Como o projeto está organizado

- **Python (pasta `logica/`)**: todo o algoritmo genético, o cálculo das distâncias e a lista de cidades.
- **Servidor (`servidor.py`)**: um servidor HTTP da biblioteca padrão do Python que entrega a página e, a cada
  pedido, executa um lote de gerações e devolve o resultado em JSON.
- **Navegador (`index.html`, `estilos.css` e `js/interface/`)**: só a interface. Mostra o mapa, o gráfico e as
  estatísticas, controla a velocidade e os botões. Nenhuma rota é calculada em JavaScript.

O caminho de uma evolução, do clique até a tela:

```
Navegador (JavaScript)                          Servidor (Python)
──────────────────────                          ─────────────────
clique em "Reiniciar população"
  envia os pontos e os parâmetros        ───►  /api/iniciar
                                                 cria 120 rotas aleatórias e guarda
                                                 a execução com um identificador
clique em "Evoluir" (a cada ciclo)
  envia o identificador, quantas          ───►  /api/evoluir
  gerações rodar e os parâmetros                 roda as gerações pedidas
  desenha a melhor rota, o gráfico e      ◄───   devolve a melhor rota, as estatísticas
  "como a última geração foi criada"             e o exemplo de reprodução
```

## 2. Vocabulário

| Termo | O que significa neste projeto |
|---|---|
| **Indivíduo (cromossomo)** | Uma rota completa: a ordem em que as cidades são visitadas, por exemplo `[4, 0, 2, 1, 3]`. |
| **Gene** | Uma cidade numa posição da rota. |
| **População** | O conjunto de rotas de uma geração (120 por padrão). |
| **Geração** | Uma rodada do algoritmo: a população inteira é substituída por uma nova. |
| **Aptidão (fitness)** | O quanto um indivíduo é bom: 1 / distância. Quanto mais curta a rota, mais apta. |
| **Seleção** | A escolha de quem vai ter filhos. Aqui, por torneio. |
| **Torneio** | Sorteia alguns indivíduos (3 por padrão) e o de menor distância vira pai. |
| **Cruzamento (crossover)** | Combina dois pais para gerar um filho. Aqui, Order Crossover (OX). |
| **Mutação** | Uma mudança aleatória no filho. Aqui, inverter um trecho da rota. |
| **Elitismo** | As melhores rotas passam direto, sem mudança, para a geração seguinte. |
| **Pressão seletiva** | O quanto a seleção favorece os melhores. Torneios maiores aumentam a pressão. |
| **Diversidade** | O quanto as rotas da população são diferentes entre si. |
| **Convergência** | A população fica parecida e a melhor rota para de melhorar. |
| **Convergência prematura** | Convergir cedo demais, numa rota ruim, por falta de diversidade. |
| **Ótimo local** | Uma rota que nenhuma mudança pequena melhora, mas que não é a melhor de todas (o ótimo global). |

## 3. Como o algoritmo genético foi aplicado

O algoritmo genético imita a evolução natural: uma **população** de soluções passa por **seleção**, **cruzamento**
e **mutação**, e a cada **geração** as soluções melhores têm mais chance de passar suas características adiante.

| Conceito | Neste problema |
|---|---|
| **Indivíduo (cromossomo)** | Uma rota: a ordem em que as cidades são visitadas, por exemplo `[4, 0, 2, 1, 3]` |
| **Gene** | Uma cidade numa posição da rota |
| **Aptidão** | 1 / distância total da rota. Quanto mais curta a rota, mais apto o indivíduo |
| **População** | 120 rotas (configurável) |
| **Seleção** | Torneio: sorteia 3 rotas e a mais curta vira pai |
| **Cruzamento** | Order Crossover (OX), com 90% de chance |
| **Mutação** | Inversão de um trecho da rota, com 50% de chance |
| **Elitismo** | As 2 melhores rotas passam direto para a próxima geração |
| **Parada** | 800 gerações seguidas sem melhorar a melhor rota |

### 3.1 O ciclo de uma geração

```
população ← 120 rotas aleatórias, ordenadas da mais curta para a mais longa   → criar_populacao_inicial
repita até passar 800 gerações seguidas sem melhorar a melhor rota:            → algoritmo_convergiu
    nova população ← as 2 rotas mais curtas (elitismo)                          → evoluir_uma_geracao
    enquanto a nova população tiver menos de 120 rotas:                         → _gerar_filho
        pai A ← torneio (sorteia 3 rotas, fica com a mais curta)               → selecionar_por_torneio
        pai B ← torneio
        com 90% de chance: filho ← cruzamento OX(pai A, pai B)                 → cruzar_com_order_crossover
        senão:              filho ← cópia do pai A
        com 50% de chance: inverte um trecho do filho                          → mutar_por_inversao
        calcula a distância do filho e o coloca na nova população              → criar_individuo
    população ← nova população, ordenada da mais curta para a mais longa
    registra a melhor, a média e a pior distância (para o gráfico)
```

Cada geração cria 118 filhos (120 menos os 2 da elite) e mede a distância de cada um. Nenhum filho é comparado com os
pais para decidir se entra: todos entram. Quem filtra as rotas ruins é a **seleção** da geração seguinte, porque rotas
longas raramente vencem torneios.

### 3.2 Por que operadores especiais?

Uma rota é uma **permutação**: cada cidade aparece exatamente uma vez. Um cruzamento comum (cortar os dois pais e
colar os pedaços) geraria filhos com cidades repetidas e outras faltando:

```
Pai A:  0 1 2 3 | 4 5 6 7
Pai B:  7 3 0 6 | 2 5 1 4
Filho:  0 1 2 3 | 2 5 1 4     ← a cidade 2 aparece duas vezes, e as cidades 6 e 7 sumiram
```

Por isso foram usados operadores que **sempre** geram permutações válidas: o Order Crossover e a mutação por inversão.

### 3.3 Seleção por torneio

Sorteia alguns indivíduos da população (3 por padrão) e o de **menor distância** vence e vira pai. O sorteio é com
reposição, então a mesma rota pode aparecer duas vezes no mesmo torneio.

- O torneio favorece as rotas curtas, mas não as escolhe sempre: uma rota mediana ainda vence quando é sorteada junto
  com rotas piores. Isso mantém diversidade.
- **Torneios maiores** aumentam a "pressão seletiva": o algoritmo converge mais rápido, mas corre mais risco de ficar
  preso numa solução ruim. Com torneio de tamanho 1 não há seleção nenhuma (o pai é sorteado ao acaso).
- A aptidão (1 / distância) é a forma "quanto maior, melhor" de dizer que a rota é curta. Na prática o torneio
  compara as distâncias diretamente, o que dá o mesmo resultado.

### 3.4 Cruzamento OX (Order Crossover)

1. Sorteia um trecho (duas posições de corte).
2. O filho recebe **exatamente esse trecho do pai A**, nas mesmas posições.
3. As posições restantes são preenchidas com as cidades que faltam, **na ordem em que aparecem no pai B**,
   começando logo depois do trecho e dando a volta.

Exemplo com trecho nas posições 2 a 4 (contando a partir de 0):

```
Pai A:  0 1 [2 3 4] 5 6 7
Pai B:  7 3 0 6 2 5 1 4
Filho:  0 6 [2 3 4] 5 1 7
```

Depois do trecho, a leitura do pai B começa na posição 5 e dá a volta: 5, 1, 4, 7, 3, 0, 6, 2. Tirando as cidades
que já vieram do pai A (2, 3 e 4), sobram 5, 1, 7, 0, 6, que preenchem as posições livres a partir da posição 5
(posições 5, 6 e 7) e depois voltam ao início (posições 0 e 1). O filho herda **um pedaço de rota do pai A** e a
**ordem relativa das outras cidades do pai B**. Este exemplo está num teste automático.

A ideia por trás: um trecho de rota bom (cidades próximas visitadas em sequência) é uma "característica" que vale a
pena herdar, e a ordem do pai B tende a manter outras sequências boas.

### 3.5 Mutação por inversão

Sorteia um trecho da rota e o **inverte**:

```
Antes:   0 1 [2 3 4 5] 6 7
Depois:  0 1 [5 4 3 2] 6 7
```

No mapa, isso equivale a trocar duas "arestas" da rota por outras duas (o movimento *2-opt*): sai a ligação 1→2 e a
ligação 5→6, entram 1→5 e 2→6, e o miolo é percorrido ao contrário. É o tipo de mudança que **desfaz cruzamentos**
entre trechos da rota (duas linhas que se cruzam no mapa sempre podem ser trocadas por duas mais curtas que não se
cruzam), por isso funciona muito melhor que simplesmente trocar duas cidades de lugar.

Se o trecho sorteado tiver uma única cidade, a inversão não muda nada.

### 3.6 Elitismo e critério de parada

- **Elitismo**: as melhores rotas são copiadas sem alteração, então **a melhor rota nunca piora** de uma geração
  para a outra (os testes verificam isso). Sem elitismo, a melhor rota poderia se perder por azar: ela pode não ser
  sorteada em nenhum torneio, ou ser estragada pelo cruzamento e pela mutação.
- **Parada**: o algoritmo para quando passa **800 gerações seguidas sem melhorar** a melhor rota. Não há como saber se
  a rota encontrada é a ótima, então o critério é "parou de melhorar".

### 3.7 Exemplo real de uma reprodução (tirado do código)

Oito capitais (SP, RJ, MG, ES, PR, SC, RS e MS), parâmetros padrão e semente 6. Este é o primeiro filho da primeira
geração, exatamente como o código gerou (e como a seção **"Como a última geração foi criada"** mostra na tela):

**1. Torneio do pai A**: sorteou rotas de 6.705, 6.741 e 7.836 km. Vence a de **6.705 km**:

```
Pai A:  SP RJ SC PR ES RS MS MG
```

**2. Torneio do pai B**: sorteou rotas de 6.889, 5.734 e 5.429 km. Vence a de **5.429 km**:

```
Pai B:  SP MG SC RS PR MS ES RJ
```

**3. Cruzamento OX** (sorteado, 90% de chance), trecho das posições 1 a 3:

```
Pai A:     SP [RJ SC PR] ES RS MS MG
Filho:     __ [RJ SC PR] __ __ __ __       o trecho do pai A fica no lugar
Pai B lido a partir da posição 4, dando a volta:  PR MS ES RJ SP MG SC RS
Sem RJ, SC e PR (já vieram do pai A):             MS ES SP MG RS
Filho:     RS [RJ SC PR] MS ES SP MG       preenche as posições 4, 5, 6, 7 e depois a 0
```

O filho do cruzamento tem **6.974 km**.

**4. Mutação por inversão** (sorteada, 50% de chance), trecho das posições 0 a 3:

```
Antes:    [RS RJ SC PR] MS ES SP MG
Depois:   [PR SC RJ RS] MS ES SP MG
```

O filho final tem **6.793 km**. Ele é **pior que os dois pais**, e isso é normal: a maioria dos filhos sai pior. O
algoritmo funciona porque, entre milhares de filhos, alguns saem melhores, e a seleção faz esses serem escolhidos
como pais com mais frequência.

Com só 8 cidades existem 2.520 rotas, então dá para testar todas: a melhor tem **4.354 km** (SP → RJ → ES → MG →
MS → RS → SC → PR → SP). Numa execução com essas mesmas cidades (semente 3), o algoritmo genético encontrou exatamente
essa rota já na primeira geração e parou 800 gerações depois, confirmando que ela não melhorava mais.

### 3.8 A distância real: fórmula de Haversine

A Terra é (quase) uma esfera, então a distância entre duas cidades não é uma reta num plano, e sim um arco sobre a
superfície. A fórmula de Haversine calcula esse arco a partir da latitude (φ) e da longitude (λ) em radianos:

```
a = sen²(Δφ / 2) + cos(φ₁) · cos(φ₂) · sen²(Δλ / 2)
distância = 2 · R · arcsen(√a)          com R = 6.371 km (raio médio da Terra)
```

Por exemplo, São Paulo–Rio de Janeiro dá cerca de 357 km (valor conferido por um teste). As distâncias entre todos os
pares de cidades são calculadas **uma única vez** numa matriz, e o comprimento de uma rota é só a soma de valores já
prontos. Isso é importante porque o algoritmo mede a distância de 118 rotas novas a cada geração.

### 3.9 Ajuste dos parâmetros

Com mutação de 30% e torneio de 4, a população perdia diversidade cedo e às vezes parava numa rota com um
cruzamento visível no mapa (convergência prematura). Comparando combinações em 10 execuções (sementes 1 a 10) com
as 27 capitais, na versão em Python:

| População | Cruzamento | Mutação | Torneio | Parada | Rota média final | Pior rota final | Vezes que achou 13.790 km | Gerações (média) |
|---|---|---|---|---|---|---|---|---|
| 120 | 90% | 30% | 4 | 400 | 14.174 km | 14.737 km | 2 de 10 | 523 |
| **120** | **90%** | **50%** | **3** | **800** | **13.899 km** | **14.397 km** | **6 de 10** | **1.263** |
| 150 | 80% | 60% | 3 | 800 | 14.089 km | 14.531 km | 4 de 10 | 1.246 |
| 200 | 80% | 70% | 2 | 800 | 14.092 km | 14.581 km | 4 de 10 | 1.886 |

Os valores em negrito viraram o padrão: tiveram a melhor média, a menor pior rota e encontraram a melhor rota
conhecida (13.790 km) com mais frequência. A primeira população aleatória tem a melhor rota por volta de 37.000 km,
então o algoritmo reduz a distância em cerca de 63%. Em Python, cada geração leva cerca de 1,5 ms com esses
parâmetros, e uma execução completa até a parada leva poucos segundos.

### 3.10 O que acontece ao mexer em cada parâmetro

Todos os parâmetros podem ser alterados na tela durante a execução e valem já na geração seguinte.

| Parâmetro | Se aumentar | Se diminuir |
|---|---|---|
| **Tamanho da população** | Mais diversidade e menos risco de convergência prematura, mas cada geração fica mais lenta. | Gerações mais rápidas, mas a população fica parecida mais cedo. |
| **Taxa de cruzamento** | Mais filhos combinam dois pais. | Mais filhos são cópias do pai A, e só a mutação traz novidade. |
| **Taxa de mutação** | Mais exploração de rotas novas (bom para escapar de ótimos locais), mas mais filhos estragados. | Menos diversidade; a população tende a estagnar. |
| **Elitismo** | Mais rotas boas preservadas, mas elas passam a dominar a população. | Com 0, a melhor rota pode se perder de uma geração para a outra. |
| **Tamanho do torneio** | Mais pressão seletiva: converge mais rápido, com mais risco de parar numa rota ruim. | Menos pressão: evolução mais lenta e mais diversa. |
| **Parada (gerações sem melhora)** | Procura por mais tempo antes de desistir. | Para mais cedo, às vezes antes da última melhora. |

A estatística **Rotas diferentes na população** mostra a diversidade: quando ela cai para poucas rotas, a população
convergiu e só a mutação ainda traz novidades.

## 4. Como a página acompanha a evolução

- **Execuções guardadas no servidor**: ao iniciar uma população, o Python cria o algoritmo, guarda na memória com um
  identificador e devolve esse identificador. Cada pedido de evolução continua a mesma execução.
- **Controle de velocidade**: de 1 a 200 gerações por segundo. A página trabalha em ciclos de pelo menos 100 ms: em
  cada ciclo pede ao Python o menor número de gerações que ocupe esse tempo e ajusta a duração do ciclo para a
  velocidade bater exatamente. Assim, 1 geração/s vira 1 geração a cada 1 s, 25 gerações/s viram 3 gerações a cada
  120 ms, e 200 gerações/s viram lotes de 20 a cada 100 ms.
- **O que aparece na tela**: a melhor rota no mapa (com a distância de cada trecho na lista lateral), o gráfico da
  melhor distância e da média de cada geração, as estatísticas da população e **como o primeiro filho da última
  geração foi criado** (os dois torneios, o trecho herdado do pai A, a ordem do pai B e o trecho invertido pela
  mutação), como no exemplo da seção 3.7.
- **Gráfico**: com o elitismo ligado, a linha da melhor distância só desce ou fica reta. A linha da média fica sempre
  acima e oscila, porque a cada geração nascem filhos piores que os pais.

## 5. Onde está cada conceito no código

| Conceito | Onde está |
|---|---|
| Indivíduo e aptidão | `logica/genetico.py`, `Individuo` |
| População inicial aleatória | `logica/genetico.py`, `criar_populacao_inicial` |
| Seleção por torneio | `logica/genetico.py`, `selecionar_por_torneio` |
| Cruzamento OX | `logica/genetico.py`, `cruzar_com_order_crossover` |
| Mutação por inversão | `logica/genetico.py`, `mutar_por_inversao` |
| Uma reprodução completa | `logica/genetico.py`, `_gerar_filho` |
| Elitismo e nova geração | `logica/genetico.py`, `evoluir_uma_geracao` |
| Critério de parada | `logica/genetico.py`, `algoritmo_convergiu` |
| Distância de Haversine | `logica/distancias.py`, `calcular_distancia_em_km` |
| Tamanho de uma rota | `logica/distancias.py`, `comprimento_da_rota` |

## 6. O que cada parte do código faz

O algoritmo fica em Python, na pasta `logica/`, e não depende do navegador (por isso é testado com `unittest`). A
pasta `js/interface/` só cuida da tela. Não há comentários no código; os nomes descrevem o que cada coisa faz.

### `logica/cidades.py`

- **`Ponto`**: nome, UF, latitude e longitude (as cidades e os pontos clicados no mapa usam a mesma estrutura).
- **`CIDADES_DO_BRASIL`**: 77 cidades com coordenadas reais, indicando quais são capitais.
- **`listar_capitais`** e **`sortear_cidades`**: os conjuntos de pontos oferecidos na tela.

### `logica/distancias.py`

- **`calcular_distancia_em_km`**: fórmula de Haversine (distância sobre a esfera terrestre, raio de 6.371 km).
- **`criar_matriz_de_distancias`**: calcula uma única vez a distância entre todos os pares de pontos, para a avaliação
  das rotas ser rápida.
- **`comprimento_da_rota`**: soma os trechos da rota, incluindo a volta ao ponto inicial.
- **`distancias_dos_trechos`**: a distância de cada trecho da melhor rota, mostrada na lista da tela.

### `logica/genetico.py`

- **`ConfiguracaoDoAlgoritmo`**: os parâmetros (população, taxas, elitismo, torneio e critério de parada).
- **`Individuo`**: uma rota e sua distância. A aptidão é 1 / distância.
- **`criar_populacao_inicial`**: rotas aleatórias (`random.sample`), ordenadas da mais curta para a mais longa.
- **`selecionar_por_torneio`**: devolve o vencedor e os participantes (os participantes aparecem na tela).
- **`cruzar_com_order_crossover`** e **`mutar_por_inversao`**: os operadores explicados acima. Devolvem também o
  trecho sorteado, para a tela destacar.
- **`criar_algoritmo_genetico`**: monta o estado inicial (pontos, matriz, população e histórico). Usa um gerador
  aleatório com semente, então a mesma semente repete a mesma evolução.
- **`_gerar_filho`**: dois torneios → cruzamento (ou cópia) → mutação (ou não) → filho avaliado. Devolve tudo o que
  aconteceu, para servir de exemplo na tela.
- **`evoluir_uma_geracao`**: copia a elite, gera filhos até completar a população, ordena, registra as estatísticas
  (melhor, média e pior distância) e guarda o primeiro filho como exemplo.
- **`algoritmo_convergiu`**: verifica o critério de parada.
- **`contar_rotas_distintas`**: mede a diversidade da população.

### `logica/api.py`

- **Execuções em andamento**: cada vez que a página inicia uma população, o Python cria um algoritmo, guarda na
  memória com um identificador e devolve esse identificador. Os pedidos seguintes usam o identificador para continuar
  a mesma evolução. O servidor guarda as 20 execuções mais recentes.
- **Rotas** (`ROTAS_DA_API`): `/api/capitais`, `/api/sortear-cidades`, `/api/iniciar` e `/api/evoluir`. Esta última
  recebe quantas gerações rodar (até 500 por pedido) e os parâmetros atuais da tela, e devolve a melhor rota, as
  estatísticas, as gerações novas do histórico e o exemplo de reprodução.
- **`configuracao_de_json`** e **`ponto_de_json`**: validam os parâmetros e as coordenadas recebidos da página.

### `servidor.py`

Estende o `SimpleHTTPRequestHandler` da biblioteca padrão: entrega os arquivos da página e trata os `POST` da API. Liga
`TCP_NODELAY` com conexões persistentes e escuta também no endereço IPv6 local (`::1`). Sem esses dois ajustes, cada
pedido levava de 60 a 250 ms no Windows; com eles, 2 a 3 ms. Os endereços são só locais, então a página não fica
acessível pela rede.

### `js/interface/` (só a tela)

- **`aplicacao.js`**: controlador da página. Carrega os pontos pedidos ao Python, trata os cliques no mapa, controla
  **Evoluir/Pausar**, **Próxima geração** e **Reiniciar**, e envia os parâmetros a cada pedido (por isso eles valem já
  na próxima geração). Também faz o **controle de velocidade** descrito na seção 4.
- **`api.js`**: envia os pedidos ao servidor e transforma respostas de erro em mensagens na tela.
- **`mapa-da-rota.js`**: cria o mapa Leaflet (imagens do OpenStreetMap escurecidas por filtro CSS), os marcadores
  numerados e a linha da melhor rota.
- **`grafico-de-evolucao.js`**: desenha no `<canvas>` a melhor distância e a média de cada geração, reduzindo o
  número de pontos quando o histórico fica grande.
- **`anatomia-da-geracao.js`**: mostra como o primeiro filho da última geração foi criado: os dois torneios, o
  trecho do pai A, a ordem do pai B, o filho colorido pela origem de cada cidade e o trecho invertido pela mutação.

### `testes/test_genetico.py`

13 testes: distância São Paulo–Rio de Janeiro (cerca de 357 km), rota fechada, conjuntos de cidades, cruzamento OX
sempre válido e preservando o trecho do pai A, o exemplo de cruzamento deste texto, inversão correta, torneio
escolhendo o melhor, elitismo nunca piorando a melhor rota, tamanho da população, critério de parada, mínimo de 4
pontos e o fluxo completo da API.

## 7. Limitações

- A distância é em linha reta, não por estradas. Usar distâncias rodoviárias exigiria um serviço de rotas externo.
- O algoritmo genético não garante a rota ótima; ele encontra rotas muito boas rapidamente. Com mais cidades,
  combinar o algoritmo com uma busca local (por exemplo, aplicar *2-opt* no melhor indivíduo) melhora o resultado.
- A contagem de "rotas diferentes" compara as rotas como listas. A mesma volta começando em outra cidade, ou
  percorrida ao contrário, conta como diferente, então o número mostrado é um pouco maior que a diversidade real.
- O mapa precisa de internet para carregar a biblioteca Leaflet e as imagens.
- As execuções ficam na memória do servidor Python. Se o servidor for reiniciado no meio de uma evolução, a página
  avisa e basta clicar em **Reiniciar população**.

## 8. Perguntas que o professor pode fazer

**Por que usar um algoritmo genético, e não testar todas as rotas?**
Porque o número de rotas cresce com o fatorial do número de cidades: com 27 capitais são cerca de 2 × 10²⁶ rotas
(seção 1). O algoritmo genético avalia cerca de 150 mil rotas numa execução típica (120 por geração, pouco mais de
1.200 gerações) e chega perto da melhor conhecida.

**O algoritmo genético garante a melhor rota?**
Não. É uma meta-heurística: encontra rotas muito boas, mas sem garantia. Nas 10 execuções com as capitais, achou a
melhor rota conhecida (13.790 km) em 6; nas outras, parou em rotas até 4,4% mais longas (seção 3.9). Com 8 cidades,
em que dá para testar todas, ele achou a ótima (seção 3.7).

**Por que não usar o cruzamento de um ponto, o mais comum?**
Porque ele gera rotas inválidas, com cidades repetidas e cidades faltando (seção 3.2). O Order Crossover sempre gera
uma permutação válida e preserva um trecho do pai A e a ordem das cidades do pai B.

**Por que a mutação inverte um trecho, em vez de trocar duas cidades?**
Porque inverter um trecho troca só duas ligações da rota (o movimento *2-opt*), e é exatamente a mudança que desfaz
um cruzamento de linhas no mapa. Trocar duas cidades de lugar muda até quatro ligações de uma vez e quase sempre piora
a rota.

**O que é o elitismo e por que ele é importante?**
É copiar as melhores rotas direto para a geração seguinte. Sem ele, a melhor rota poderia se perder por azar. Com
ele, o gráfico da melhor distância nunca sobe (seção 3.6).

**O que é convergência prematura e como foi evitada?**
É a população ficar toda parecida cedo demais, presa numa rota ruim. Aconteceu com mutação de 30% e torneio de 4: às
vezes o resultado final tinha duas linhas se cruzando no mapa. Aumentar a mutação para 50% e diminuir o torneio para 3
manteve mais diversidade e melhorou a média final (seção 3.9).

**Por que o filho muitas vezes é pior que os pais?**
Porque cruzamento e mutação são aleatórios. O que faz o algoritmo funcionar não é cada filho ser bom, e sim a seleção
escolher com mais frequência os filhos que saíram bons (seção 3.7).

**Como a distância é calculada?**
Pela fórmula de Haversine, que dá a distância sobre a superfície da Terra a partir da latitude e da longitude
(seção 3.8). Não é a distância por estradas.

**O que a taxa de mutação de 50% significa?**
Que metade dos filhos recebe uma inversão de trecho. É uma taxa alta comparada a outros problemas, mas aqui cada
mutação é uma mudança pequena (troca duas ligações da rota), então ela ajuda a refinar as rotas sem destruí-las.

## 9. Roteiro sugerido para a apresentação

1. Abra a página com as **27 capitais** e mostre a população inicial: a melhor rota aleatória tem dezenas de
   milhares de quilômetros e cruza o país várias vezes.
2. Clique em **Próxima geração** algumas vezes e mostre **"Como a última geração foi criada"**: os dois torneios, o
   trecho herdado do pai A, a ordem do pai B e a inversão.
3. Clique em **Evoluir** numa velocidade baixa e mostre no mapa os cruzamentos de linhas sendo desfeitos.
4. Acelere e mostre o **gráfico**: a melhor distância só desce (elitismo) e a média fica acima, oscilando.
5. Mostre as **estatísticas**: rotas diferentes na população caindo (convergência) e a última melhora.
6. Mude um parâmetro durante a execução (por exemplo, mutação 0%) e mostre que a evolução estagna.
7. Use **Sortear cidades** ou clique no mapa para criar os próprios pontos e resolver de novo.
