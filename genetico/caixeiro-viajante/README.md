# Algoritmo genético: Problema do Caixeiro Viajante

Encontra uma rota curta que passa por todas as cidades e volta ao ponto de partida, usando um **algoritmo
genético**. As cidades ficam num **mapa real** (OpenStreetMap) e as distâncias são as distâncias reais em linha
reta entre as coordenadas (fórmula de Haversine), em quilômetros.

A página permite:

- usar as **27 capitais do Brasil**, **sortear cidades** (de uma lista com 77 cidades) ou **clicar no mapa** para criar os próprios pontos;
- **evoluir** a população automaticamente, **pausar** e avançar **uma geração por vez**;
- **acelerar e desacelerar** a evolução (de 1 a 1.000 gerações por segundo);
- acompanhar a melhor rota no mapa, o gráfico da evolução, as estatísticas da população e **como a última geração
  foi criada** (torneio, cruzamento e mutação, gene a gene);
- mudar os parâmetros do algoritmo durante a execução.

## Requisitos

- Navegador moderno (Chrome, Edge ou Firefox)
- **Internet**, para carregar o mapa (biblioteca Leaflet e imagens do OpenStreetMap)
- **Node.js 18 ou superior** para o servidor local e os testes. Não precisa de `npm install`.
  - Alternativa sem Node: Python 3 (`python -m http.server 8000`)

## Como rodar

```bash
cd genetico/caixeiro-viajante
```

```bash
npm start
```

Abra **http://localhost:8000** no navegador. Para usar outra porta:

```bash
node servidor.js 8081
```

> Abrir o `index.html` com dois cliques não funciona: o navegador bloqueia módulos JavaScript em arquivos locais.

## Como usar

| Controle | O que faz |
|---|---|
| **▶ Evoluir / ⏸ Pausar** | Roda as gerações continuamente. Atalho: `Espaço`. |
| **⏭ Próxima geração** | Evolui só uma geração. Atalho: `→`. |
| **↺ Reiniciar população** | Cria uma nova população aleatória com os mesmos pontos. |
| **− / barra / +** | Desacelera ou acelera (1, 2, 5, 10, 30, 60, 200 ou 1.000 gerações por segundo). |
| **Conjunto de pontos** | Capitais, cidades sorteadas ou pontos próprios. |
| **🎲 Sortear cidades** | Sorteia novas cidades (a quantidade vem da barra logo acima). |
| **Clique no mapa / no ponto** | Adiciona ou remove um ponto. |

Parâmetros (valem a partir da próxima geração): tamanho da população, taxa de cruzamento, taxa de mutação,
elitismo, tamanho do torneio e critério de parada (gerações seguidas sem melhora).

## Testes

```bash
npm test
```

## Arquivos

```
caixeiro-viajante/
├── index.html, estilos.css       Página e visual
├── servidor.js, package.json     Servidor local e scripts
├── js/logica/                    Algoritmo (não depende do navegador)
│   ├── aleatorio.js              Números aleatórios com semente e embaralhamento
│   ├── cidades.js                77 cidades brasileiras com coordenadas reais
│   ├── distancias.js             Haversine, matriz de distâncias e tamanho da rota
│   └── genetico.js               População, torneio, cruzamento OX, mutação por inversão e elitismo
├── js/interface/                 Tela
│   ├── aplicacao.js              Controles, velocidade e atualização da tela
│   ├── mapa-da-rota.js           Mapa (Leaflet), pontos e rota
│   ├── grafico-de-evolucao.js    Gráfico da melhor distância e da média por geração
│   └── anatomia-da-geracao.js    Mostra a seleção, o cruzamento e a mutação da última geração
├── testes/                       Testes automatizados (node --test)
└── EXPLICACAO.md                 Explicação do algoritmo e de cada parte do código
```
