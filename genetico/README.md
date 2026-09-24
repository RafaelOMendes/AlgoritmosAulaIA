# Algoritmo genético: Problema do Caixeiro Viajante

Encontra uma rota curta que passa por todas as cidades e volta ao ponto de partida, usando um **algoritmo
genético**. As cidades ficam num **mapa real** (OpenStreetMap) e as distâncias são as distâncias reais em linha
reta entre as coordenadas (fórmula de Haversine), em quilômetros.

O **algoritmo roda em Python**: população, seleção, cruzamento, mutação, distâncias e a lista de cidades ficam na
pasta `logica/`. Um pequeno servidor em Python (`servidor.py`) entrega a página web e executa as gerações quando a
página pede. O JavaScript só desenha o mapa, o gráfico e os controles.

A página permite:

- usar as **27 capitais do Brasil**, **sortear cidades** (de uma lista com 77 cidades) ou **clicar no mapa** para criar os próprios pontos;
- **evoluir** a população automaticamente, **pausar** e avançar **uma geração por vez**;
- **acelerar e desacelerar** a evolução (de 1 a 200 gerações por segundo);
- acompanhar a melhor rota no mapa, o gráfico da evolução, as estatísticas da população e **como a última geração
  foi criada** (torneio, cruzamento e mutação, gene a gene);
- mudar os parâmetros do algoritmo durante a execução.

## Requisitos

- **Python 3.10 ou superior** (testado no Python 3.14). Não precisa instalar nenhuma biblioteca.
- Navegador moderno (Chrome, Edge ou Firefox)
- **Internet**, para carregar o mapa (biblioteca Leaflet e imagens do OpenStreetMap)

## Como rodar

```bash
cd genetico
```

```bash
python servidor.py
```

Abra **http://localhost:8000** no navegador. Para usar outra porta (por exemplo, para rodar junto com o Minimax):

```bash
python servidor.py 8001
```

> A página precisa do servidor Python, porque é ele que executa o algoritmo. Abrir o `index.html` com dois cliques
> não funciona; a própria página mostra um aviso. No Windows, se `python` não for reconhecido, use `py servidor.py`.

## Como usar

| Controle | O que faz |
|---|---|
| **▶ Evoluir / ⏸ Pausar** | Roda as gerações continuamente. Atalho: `Espaço`. |
| **⏭ Próxima geração** | Evolui só uma geração. Atalho: `→`. |
| **↺ Reiniciar população** | Cria uma nova população aleatória com os mesmos pontos. |
| **− / barra / +** | Desacelera ou acelera (1, 2, 5, 10, 25, 50, 100 ou 200 gerações por segundo). |
| **Conjunto de pontos** | Capitais, cidades sorteadas ou pontos próprios. |
| **🎲 Sortear cidades** | Sorteia novas cidades (a quantidade vem da barra logo acima). |
| **Clique no mapa / no ponto** | Adiciona ou remove um ponto. |

Parâmetros (valem a partir da próxima geração): tamanho da população, taxa de cruzamento, taxa de mutação,
elitismo, tamanho do torneio e critério de parada (gerações seguidas sem melhora).

## Testes

```bash
python -m unittest -v
```

São 13 testes (`unittest`, da biblioteca padrão) cobrindo distâncias, cidades, operadores genéticos, o algoritmo
e a API usada pela página.

## Arquivos

```
genetico/
├── servidor.py                   Servidor HTTP: entrega a página e responde à API
├── logica/                       O algoritmo, em Python
│   ├── cidades.py                77 cidades brasileiras com coordenadas reais
│   ├── distancias.py             Haversine, matriz de distâncias e tamanho da rota
│   ├── genetico.py               População, torneio, cruzamento OX, mutação por inversão e elitismo
│   └── api.py                    Guarda as execuções e converte pedidos e respostas para JSON
├── testes/                       Testes automatizados (unittest)
├── index.html, estilos.css       Página e visual
├── js/interface/                 Só a tela (não calcula nenhuma rota)
│   ├── aplicacao.js              Controles, velocidade e atualização da tela
│   ├── api.js                    Envia os pedidos ao servidor Python
│   ├── mapa-da-rota.js           Mapa (Leaflet), pontos e rota
│   ├── grafico-de-evolucao.js    Gráfico da melhor distância e da média por geração
│   └── anatomia-da-geracao.js    Mostra a seleção, o cruzamento e a mutação da última geração
└── EXPLICACAO.md                 Explicação do algoritmo e de cada parte do código
```
