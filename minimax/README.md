# Minimax: Fuga no Labirinto (estilo Tron)

Duas motos de luz andam num labirinto quadrado deixando um rastro sólido. Quem bater em uma parede, no próprio
rastro ou no rastro do oponente perde. O agente **Azul** decide cada movimento com o algoritmo **Minimax**
(com poda alfa-beta opcional), tentando **maximizar o próprio espaço e minimizar o espaço do oponente**.

A interface web permite:

- gerar um **labirinto aleatório** a cada reset;
- **resolver** a partida automaticamente, **pausar** e avançar **passo a passo**;
- **acelerar e desacelerar** a resolução (de 0,5 a 30 passos por segundo);
- acompanhar cada rodada: jogadas, valor do Minimax, nós visitados, podas e tempo;
- abrir um **modal com a árvore de decisão** de qualquer rodada, navegar pelos nós e ver o tabuleiro de cada um.

## Requisitos

- Um navegador moderno (Chrome, Edge ou Firefox)
- **Node.js 18 ou superior** para o servidor local e os testes (testado no Node 24)
  - Alternativa sem Node: Python 3 (só para servir os arquivos)
- Nenhuma dependência para instalar: não precisa de `npm install`

## Como rodar

1. Entre na pasta `minimax`:

   ```bash
   cd minimax
   ```

2. Inicie o servidor local:

   ```bash
   npm start
   ```

3. Abra no navegador o endereço que aparece no terminal: **http://localhost:8000**

Para usar outra porta (por exemplo, se a 8000 estiver ocupada):

```bash
node servidor.js 8080
```

Sem Node.js, dá para servir a pasta com o Python:

```bash
python -m http.server 8000
```

> **Importante:** abrir o `index.html` com dois cliques não funciona, porque o navegador bloqueia módulos
> JavaScript em arquivos locais (`file://`). A própria página mostra um aviso se isso acontecer.

## Como usar

| Controle | O que faz |
|---|---|
| **▶ Resolver / ⏸ Pausar** | Joga a partida automaticamente até o fim; clicar de novo pausa. Atalho: `Espaço`. |
| **⏭ Próximo passo** | Joga uma única rodada. Atalho: `→`. |
| **↺ Reiniciar** | Recomeça a partida **no mesmo labirinto** (útil para comparar configurações). |
| **⟳ Resetar (novo labirinto)** | Gera um **labirinto aleatório novo** e recomeça. |
| **− / barra / +** | Desacelera ou acelera a resolução. |
| **Ver árvore de decisão** | Abre o modal com a árvore do Minimax da última rodada (ou da próxima, se a partida ainda não começou). Atalho: `A`. |
| **Árvore** (no acompanhamento) | Abre a árvore de decisão de uma rodada específica. |

Configurações do painel lateral:

- **Tamanho do labirinto**: 13 × 13, 17 × 17 ou 21 × 21 (gera um labirinto novo).
- **Profundidade do Azul**: quantas rodadas à frente o Minimax simula (1 a 5). Cada rodada são 2 níveis da árvore.
- **Estratégia do Laranja**: Minimax (com profundidade própria), Guloso ou Aleatório.
- **Usar poda alfa-beta**: liga ou desliga a otimização (o resultado é o mesmo; muda a quantidade de nós visitados).
- **Mostrar território**: pinta cada célula livre com a cor de quem chega nela primeiro. É exatamente o que a função de avaliação do Minimax mede.

No modal da árvore:

- **Clique em um nó** para abrir ou fechar os filhos e ver os detalhes no painel da direita (tabuleiro daquele momento, valor, janela alfa-beta e o motivo da escolha).
- **Expandir caminho escolhido**, **Expandir mais um nível**, **Recolher tudo** e **zoom** (− / +).
- Troque o **Agente** para ver a árvore do Laranja, quando ele também usa Minimax.

## Como rodar os testes

Dentro da pasta `minimax`:

```bash
npm test
```

São 24 testes (`node --test`) cobrindo a geração do labirinto, as regras do jogo, a função de avaliação, o Minimax, a poda alfa-beta e partidas completas.

## Estrutura dos arquivos

```
minimax/
├── index.html                    Estrutura da página e do modal da árvore
├── estilos.css                   Visual (tema escuro estilo Tron)
├── servidor.js                   Servidor local sem dependências (npm start)
├── package.json                  Scripts start e test
├── js/
│   ├── logica/                   Regras e algoritmo (não dependem do navegador)
│   │   ├── aleatorio.js          Gerador de números aleatórios com semente
│   │   ├── tabuleiro.js          Células, direções e coordenadas do grid
│   │   ├── labirinto.js          Geração aleatória e simétrica do labirinto
│   │   ├── jogo.js               Estado da partida, movimentos e colisões
│   │   ├── avaliacao.js          Função de avaliação (território por BFS)
│   │   ├── minimax.js            Minimax com poda alfa-beta e registro da árvore
│   │   ├── estrategias.js        Agentes: Minimax, Guloso e Aleatório
│   │   └── partida.js            Controle da partida e histórico das rodadas
│   └── interface/                Tudo o que mexe na tela
│       ├── aplicacao.js          Botões, velocidade, placar e acompanhamento
│       ├── desenho-do-tabuleiro.js  Desenho do labirinto no canvas
│       ├── arvore-de-decisao.js  Modal com a árvore de decisão em SVG
│       └── formatacao.js         Formatação de números, valores e movimentos
├── testes/                       Testes automatizados (node --test)
└── EXPLICACAO.md                 Explicação detalhada do Minimax e de cada parte do código
```
