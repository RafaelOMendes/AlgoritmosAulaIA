# Algoritmo genético: Design de Interface Automático

Um **algoritmo genético** cria e evolui variações de uma **tela de celular** (uma carteira digital com título,
texto, lista, botão e link). Cada variação é descrita por **17 genes** (cores do fundo, do texto e do botão,
tamanho da fonte, escala do título, altura da linha, altura do botão, margens, espaçamento e arredondamento) e recebe
uma **nota de 0 a 100** calculada por métricas de **legibilidade e usabilidade**:

- contraste do texto e do botão pelo padrão **WCAG** (7:1 para nota máxima);
- destaque do botão em relação ao fundo (3:1, WCAG 1.4.11) e fundo pouco saturado;
- tamanho da fonte (16–18 px), hierarquia do título e altura da linha (1,45–1,55);
- **área de toque** do botão (48–56 px, recomendações da Apple e do Material Design);
- margens, espaçamento e **grade de 8 px**;
- caracteres por linha e se o conteúdo **ocupa bem a tela** sem transbordar.

A página permite **evoluir**, **pausar**, avançar **uma geração por vez**, **acelerar e desacelerar** (1 a 1.000
gerações por segundo) e acompanhar a melhor tela, a nota de cada métrica, o gráfico da evolução, **a população
inteira** desenhada como celulares em miniatura e **como um filho foi criado** (pais, cruzamento e mutação gene a gene).

## Requisitos

- Navegador moderno (Chrome, Edge ou Firefox)
- **Node.js 18 ou superior** para o servidor local e os testes. Não precisa de `npm install` nem de internet.
  - Alternativa sem Node: Python 3 (`python -m http.server 8000`)

## Como rodar

```bash
cd genetico/design-de-interface
```

```bash
npm start
```

Abra **http://localhost:8000** no navegador. Para usar outra porta:

```bash
node servidor.js 8082
```

> Abrir o `index.html` com dois cliques não funciona: o navegador bloqueia módulos JavaScript em arquivos locais.

## Como usar

| Controle | O que faz |
|---|---|
| **▶ Evoluir / ⏸ Pausar** | Roda as gerações continuamente. Atalho: `Espaço`. |
| **⏭ Próxima geração** | Evolui só uma geração. Atalho: `→`. |
| **↺ Nova população** | Sorteia uma nova população aleatória. |
| **− / barra / +** | Desacelera ou acelera. Começa em 2 gerações por segundo para dar tempo de ver as telas mudando. |

Parâmetros (valem a partir da próxima geração): tamanho da população, taxa de cruzamento, chance de mutação de cada
gene, intensidade da mutação, elitismo, tamanho do torneio e critério de parada. A evolução para sozinha ao atingir
nota 100 ou depois de muitas gerações sem melhora.

## Testes

```bash
npm test
```

## Arquivos

```
design-de-interface/
├── index.html, estilos.css       Página e visual
├── servidor.js, package.json     Servidor local e scripts
├── js/logica/                    Algoritmo (não depende do navegador)
│   ├── aleatorio.js              Números aleatórios com semente e distribuição normal
│   ├── genes.js                  Definição dos 17 genes, limites e arredondamento
│   ├── cores.js                  HSL para RGB, luminância e razão de contraste (WCAG)
│   ├── metricas.js               As 12 métricas de legibilidade e a nota final
│   └── genetico.js               População, torneio, cruzamento uniforme, mutação gaussiana e elitismo
├── js/interface/                 Tela
│   ├── aplicacao.js              Controles, velocidade e atualização da tela
│   ├── maquete-do-celular.js     Desenha a tela de celular a partir dos genes
│   ├── grafico-de-evolucao.js    Gráfico da melhor nota e da média por geração
│   └── anatomia-da-geracao.js    Mostra os pais, o filho e a origem de cada gene
├── testes/                       Testes automatizados (node --test)
└── EXPLICACAO.md                 Explicação do algoritmo e de cada parte do código
```
