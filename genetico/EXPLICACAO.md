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

### 1.1 Como o projeto está organizado

- **Python (pasta `logica/`)**: todo o algoritmo genético, o cálculo das distâncias e a lista de cidades.
- **Servidor (`servidor.py`)**: um servidor HTTP da biblioteca padrão do Python que entrega a página e, a cada
  pedido, executa um lote de gerações e devolve o resultado em JSON.
- **Navegador (`index.html`, `estilos.css` e `js/interface/`)**: só a interface. Mostra o mapa, o gráfico e as
  estatísticas, controla a velocidade e os botões. Nenhuma rota é calculada em JavaScript.

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

## 3. O que cada parte do código faz

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
- **`criar_algoritmo_genetico`**: monta o estado inicial (pontos, matriz, população e histórico).
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
  na próxima geração). O **controle de velocidade** trabalha em ciclos de pelo menos 100 ms: em cada ciclo pede ao
  Python `velocidade × duração do ciclo` gerações e espera o tempo que faltar. Assim, 10 gerações/s viram 1 geração a
  cada 100 ms, e 200 gerações/s viram lotes de 20.
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

## 4. Limitações

- A distância é em linha reta, não por estradas. Usar distâncias rodoviárias exigiria um serviço de rotas externo.
- O algoritmo genético não garante a rota ótima; ele encontra rotas muito boas rapidamente. Com mais cidades,
  combinar o algoritmo com uma busca local (por exemplo, aplicar *2-opt* no melhor indivíduo) melhora o resultado.
- O mapa precisa de internet para carregar a biblioteca Leaflet e as imagens.
- As execuções ficam na memória do servidor Python. Se o servidor for reiniciado no meio de uma evolução, a página
  avisa e basta clicar em **Reiniciar população**.
