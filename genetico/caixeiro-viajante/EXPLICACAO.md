# Explicação: Caixeiro Viajante com algoritmo genético

## 1. O problema

Um vendedor precisa visitar todas as cidades de uma lista **uma única vez** e voltar à cidade de partida,
percorrendo a **menor distância possível**. Parece simples, mas o número de rotas possíveis explode: com n cidades
existem (n − 1)! / 2 rotas diferentes. Para as 27 capitais do Brasil isso dá cerca de **2 × 10²⁶ rotas**, e testar
todas levaria bilhões de anos. É um problema **NP-difícil**, por isso se usam métodos que encontram rotas muito boas
em pouco tempo, como o algoritmo genético.

Neste projeto os pontos ficam num **mapa real** (OpenStreetMap, com a biblioteca Leaflet) e a distância entre duas
cidades é a **distância real em linha reta** sobre a superfície da Terra, calculada pela **fórmula de Haversine** a
partir da latitude e da longitude.

## 2. Como o algoritmo genético foi aplicado

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

### 2.1 Por que operadores especiais?

Uma rota é uma **permutação**: cada cidade aparece exatamente uma vez. Um cruzamento comum (cortar os dois pais e
colar os pedaços) geraria filhos com cidades repetidas e outras faltando. Por isso foram usados operadores que
**sempre** geram permutações válidas.

### 2.2 Cruzamento OX (Order Crossover)

1. Sorteia um trecho (duas posições de corte).
2. O filho recebe **exatamente esse trecho do pai A**, nas mesmas posições.
3. As posições restantes são preenchidas com as cidades que faltam, **na ordem em que aparecem no pai B**,
   começando logo depois do trecho e dando a volta.

Exemplo com trecho nas posições 2 a 4:

```
Pai A:  0 1 [2 3 4] 5 6 7
Pai B:  7 3 0 6 2 5 1 4
Filho:  0 6 [2 3 4] 5 1 7
```

Depois do trecho, a leitura do pai B começa na posição 5 e dá a volta: 5, 1, 4, 7, 3, 0, 6, 2. Tirando as cidades
que já vieram do pai A (2, 3 e 4), sobram 5, 1, 7, 0, 6, que preenchem as posições livres a partir da posição 5
(posições 5, 6 e 7) e depois voltam ao início (posições 0 e 1). O filho herda um pedaço de rota do pai A e a ordem relativa das outras cidades do pai B.

### 2.3 Mutação por inversão

Sorteia um trecho da rota e o **inverte**:

```
Antes:   0 1 [2 3 4 5] 6 7
Depois:  0 1 [5 4 3 2] 6 7
```

No mapa, isso equivale a trocar duas "arestas" da rota por outras duas (o movimento *2-opt*). É o tipo de mudança
que **desfaz cruzamentos** entre trechos da rota, por isso funciona muito melhor que simplesmente trocar duas
cidades de lugar.

### 2.4 Seleção por torneio e elitismo

- **Torneio**: sorteia alguns indivíduos (3 por padrão) e o de menor distância vence. Torneios maiores aumentam a
  "pressão seletiva": o algoritmo converge mais rápido, mas corre mais risco de ficar preso numa solução ruim.
- **Elitismo**: as melhores rotas são copiadas sem alteração, então **a melhor rota nunca piora** de uma geração
  para a outra (os testes verificam isso).

### 2.5 Ajuste dos parâmetros

Com mutação de 30% e torneio de 4, a população perdia diversidade cedo e às vezes parava numa rota com um
cruzamento visível no mapa (convergência prematura). Comparando combinações em 6 execuções com as 27 capitais:

| População | Mutação | Torneio | Rota média final | Melhor rota encontrada |
|---|---|---|---|---|
| 120 | 30% | 4 | 14.164 km | 13.790 km |
| **120** | **50%** | **3** | **13.971 km** | **13.790 km** |
| 150 | 60% | 3 | 13.971 km | 13.790 km |
| 200 | 70% | 2 | 13.997 km | 13.790 km |

Os valores em negrito viraram o padrão: a mesma qualidade das configurações maiores, com menos trabalho. A primeira
população aleatória costuma ter a melhor rota por volta de 40.000 km, então o algoritmo reduz a distância em cerca
de 65%.

## 3. O que cada parte do código faz

O código tem duas camadas: `js/logica` (algoritmo, sem depender do navegador, testado com Node) e `js/interface`
(tela). Não há comentários no código; os nomes descrevem o que cada coisa faz.

### `js/logica/aleatorio.js`

- **`criarGeradorAleatorio(semente)`**: números pseudoaleatórios com semente (*mulberry32*), para as execuções serem reproduzíveis.
- **`sortearInteiro`**: sorteia um inteiro num intervalo.
- **`embaralhar`**: embaralhamento de Fisher-Yates, usado para criar rotas aleatórias.
- **`gerarSementeAleatoria`**: semente nova a cada reinício.

### `js/logica/cidades.js`

- **`CIDADES_DO_BRASIL`**: 77 cidades com nome, UF, latitude, longitude e se é capital.
- **`listarCapitais`** e **`sortearCidades`**: os conjuntos de pontos oferecidos na tela.

### `js/logica/distancias.js`

- **`calcularDistanciaEmKm`**: fórmula de Haversine (distância sobre a esfera terrestre, raio de 6.371 km).
- **`criarMatrizDeDistancias`**: calcula uma única vez a distância entre todos os pares de pontos, para a avaliação
  das rotas ser rápida.
- **`distanciaEntre`** e **`comprimentoDaRota`**: somam os trechos da rota, incluindo a volta ao ponto inicial.

### `js/logica/genetico.js`

- **`CONFIGURACAO_PADRAO`**: parâmetros padrão.
- **`criarIndividuo`**: guarda a rota, a distância e a aptidão.
- **`criarPopulacaoInicial`**: rotas aleatórias, ordenadas da mais curta para a mais longa.
- **`selecionarPorTorneio`**: devolve o vencedor e os participantes (os participantes aparecem na tela).
- **`cruzarComOrderCrossover`** e **`mutarPorInversao`**: os operadores explicados acima. Devolvem também o trecho
  sorteado, para a tela destacar.
- **`criarAlgoritmoGenetico`**: monta o estado inicial (pontos, matriz, população, histórico).
- **`gerarFilho`**: dois torneios → cruzamento (ou cópia) → mutação (ou não) → filho avaliado.
- **`evoluirUmaGeracao`**: copia a elite, gera filhos até completar a população, ordena, registra as estatísticas
  (melhor, média e pior distância) e guarda o primeiro filho como exemplo para a tela.
- **`algoritmoConvergiu`**: verifica o critério de parada.
- **`contarRotasDistintas`**: mede a diversidade da população.

### `js/interface/`

- **`aplicacao.js`**: controlador da página. Lê os parâmetros (que valem já na próxima geração), controla
  **Evoluir/Pausar**, **Próxima geração** e **Reiniciar**, carrega os conjuntos de pontos e trata os cliques no mapa.
  O **controle de velocidade** acumula quantas gerações devem acontecer pelo tempo que passou (de 1 a 1.000 por
  segundo), limita o cálculo a 14 ms por ciclo para a página não travar e redesenha a tela no máximo cerca de 11
  vezes por segundo.
- **`mapa-da-rota.js`**: cria o mapa Leaflet (imagens do OpenStreetMap escurecidas por filtro CSS), os marcadores
  numerados e a linha da melhor rota.
- **`grafico-de-evolucao.js`**: desenha no `<canvas>` a melhor distância e a média de cada geração, reduzindo o
  número de pontos quando o histórico fica grande.
- **`anatomia-da-geracao.js`**: mostra como o primeiro filho da última geração foi criado: os dois torneios, o
  trecho do pai A, a ordem do pai B, o filho colorido pela origem de cada cidade e o trecho invertido pela mutação.

### `testes/genetico.test.js`

10 testes: distância São Paulo–Rio de Janeiro (cerca de 357 km), rota fechada, conjuntos de cidades, cruzamento OX
sempre válido e preservando o trecho do pai A, inversão correta, torneio escolhendo o melhor, elitismo nunca piorando
a melhor rota, tamanho da população, critério de parada e mínimo de 4 pontos.

## 4. Limitações

- A distância é em linha reta, não por estradas. Usar distâncias rodoviárias exigiria um serviço de rotas externo.
- O algoritmo genético não garante a rota ótima; ele encontra rotas muito boas rapidamente. Com mais cidades,
  combinar o algoritmo com uma busca local (por exemplo, aplicar *2-opt* no melhor indivíduo) melhora o resultado.
- O mapa precisa de internet para carregar a biblioteca Leaflet e as imagens.
