# Minimax: Fuga no Labirinto (estilo Tron)

Duas motos de luz andam num labirinto quadrado deixando um rastro sólido. Quem bater em uma parede, no próprio
rastro ou no rastro do oponente perde. O agente **Azul** decide cada movimento com o algoritmo **Minimax**
(com poda alfa-beta opcional), tentando **maximizar o próprio espaço e minimizar o espaço do oponente**.

O **algoritmo roda em Python**: o Minimax, as regras do jogo, a geração do labirinto e a função de avaliação ficam
na pasta `logica/`. Um pequeno servidor em Python (`servidor.py`) entrega a página web e responde aos pedidos dela.
O JavaScript só desenha a tela e envia os cliques.

A interface web permite:

- gerar um **labirinto aleatório** a cada reset;
- **resolver** a partida automaticamente, **pausar** e avançar **passo a passo**;
- **acelerar e desacelerar** a resolução (de 0,5 a 30 passos por segundo);
- acompanhar cada rodada: jogadas, valor do Minimax, nós visitados, podas e tempo;
- abrir um **modal com a árvore de decisão** de qualquer rodada, navegar pelos nós e ver o tabuleiro de cada um.

## Requisitos

- **Python 3.10 ou superior** (testado no Python 3.14)
- Um navegador moderno (Chrome, Edge ou Firefox)
- Nenhuma biblioteca para instalar: só a biblioteca padrão do Python

## Como rodar

1. Entre na pasta `minimax`:

   ```bash
   cd minimax
   ```

2. Inicie o servidor:

   ```bash
   python servidor.py
   ```

3. Abra no navegador: **http://localhost:8000**

Para usar outra porta (por exemplo, se a 8000 estiver ocupada):

```bash
python servidor.py 8080
```

> **Importante:** a página precisa do servidor Python, porque é ele que calcula as jogadas. Abrir o `index.html`
> com dois cliques ou com outro servidor de arquivos não funciona; a própria página mostra um aviso.
>
> No Windows, se `python` não for reconhecido, use `py servidor.py`.

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
- **Profundidade do Azul**: quantas rodadas à frente o Minimax simula (1 a 10). Cada rodada são 2 níveis da árvore.
  A partir da profundidade 5, os movimentos da raiz são calculados em paralelo, em processos separados. As
  profundidades altas são lentas: no labirinto 17 × 17, a primeira jogada leva cerca de 4 s na profundidade 7, 33 s
  na 9 e 1,5 min na 10 (no 13 × 13, a profundidade 10 levou 5 s). Uma busca em andamento não pode ser cancelada.
- **Estratégia do Laranja**: Minimax (com profundidade própria), Guloso ou Aleatório.
- **Usar poda alfa-beta**: liga ou desliga a otimização (o resultado é o mesmo; muda a quantidade de nós visitados).
  Sem poda e com profundidade 5 ou mais, cada jogada pode levar vários segundos.
- **Mostrar território**: pinta cada célula livre com a cor de quem chega nela primeiro. É exatamente o que a função de avaliação do Minimax mede.

No modal da árvore:

- **Clique em um nó** para abrir ou fechar os filhos e ver os detalhes no painel da direita (tabuleiro daquele momento, valor, janela alfa-beta e o motivo da escolha).
- **Expandir caminho escolhido**, **Expandir mais um nível**, **Recolher tudo** e **zoom** (− / +).
- Troque o **Agente** para ver a árvore do Laranja, quando ele também usa Minimax.
- A árvore é desenhada até a profundidade 5. Acima disso ela passa de centenas de milhares de nós, e o modal mostra um
  aviso.

## Como rodar os testes

Dentro da pasta `minimax`:

```bash
python -m unittest -v
```

São 33 testes (`unittest`, da biblioteca padrão) cobrindo a geração do labirinto, as regras do jogo, a função de
avaliação, o Minimax, a poda alfa-beta, a busca com a raiz em paralelo, partidas completas e a API usada pela página.
O teste que compara com a versão em C++ só roda onde a biblioteca compilada funciona (Linux); no Windows ele aparece
como `skipped`.

## Versão experimental em C++ (opcional)

A pasta `logica/` também tem o mesmo Minimax escrito em C++ (`minimax.cpp`), chamado pelo Python com `ctypes`
(`minimax_cpp_wrapper.py`). A página **não usa** essa versão: ela serve para comparar a velocidade (cerca de 30 vezes
mais rápida) e é conferida por um teste automático. A biblioteca `minimax_cpp_lib.so` já vem compilada para Linux.
Para compilar de novo, no Linux ou no WSL, dentro da pasta `logica`:

```bash
g++ -shared -fPIC -O3 -std=c++11 -pthread minimax.cpp -o minimax_cpp_lib.so
```

## Estrutura dos arquivos

```
minimax/
├── servidor.py                   Servidor HTTP: entrega a página e responde à API
├── logica/                       O algoritmo, em Python
│   ├── tabuleiro.py              Células, direções e vizinhos de cada posição do grid
│   ├── labirinto.py              Geração aleatória e simétrica do labirinto
│   ├── jogo.py                   Estado da partida, movimentos, colisões e fazer/desfazer rodada
│   ├── avaliacao.py              Função de avaliação (território por busca em largura)
│   ├── minimax.py                Minimax com poda alfa-beta, raiz em paralelo e registro da árvore
│   ├── estrategias.py            Agentes: Minimax, Guloso e Aleatório
│   ├── partida.py                Rodadas, simulação de partidas e reconstrução da árvore
│   ├── api.py                    Converte pedidos e respostas da página para JSON
│   ├── minimax.cpp               Versão experimental do Minimax em C++ (não usada pela página)
│   ├── minimax_cpp_wrapper.py    Chama a versão em C++ a partir do Python (ctypes)
│   └── minimax_cpp_lib.so        Versão em C++ já compilada para Linux
├── testes/                       Testes automatizados (unittest)
├── index.html                    Estrutura da página e do modal da árvore
├── estilos.css                   Visual (tema escuro estilo Tron)
├── js/interface/                 Só a tela (não calcula nenhuma jogada)
│   ├── aplicacao.js              Botões, velocidade, placar e acompanhamento
│   ├── api.js                    Envia os pedidos ao servidor Python
│   ├── desenho-do-tabuleiro.js   Desenho do labirinto no canvas
│   ├── arvore-de-decisao.js      Modal com a árvore de decisão em SVG
│   ├── formatacao.js             Formatação de números, valores e movimentos
│   └── tabuleiro.js              Constantes e coordenadas usadas no desenho
└── EXPLICACAO.md                 Explicação detalhada do Minimax e de cada parte do código
```
