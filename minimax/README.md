# Minimax: Fuga no Labirinto (estilo Tron)

Duas motos de luz andam num labirinto quadrado deixando um rastro sólido. Quem bater em uma parede, no próprio
rastro ou no rastro do oponente perde. O agente **Azul** decide cada movimento com o algoritmo **Minimax**
(com poda alfa-beta opcional), tentando **maximizar o próprio espaço e minimizar o espaço do oponente**.

O **algoritmo roda em Python**: o Minimax, as regras do jogo, a geração do labirinto e a função de avaliação ficam
na pasta `logica/`. Um pequeno servidor em Python (`servidor.py`) entrega a página web e responde aos pedidos dela.
O JavaScript só desenha a tela e envia os cliques. Com o interruptor **Turbo** ligado, a busca do Minimax passa a
rodar numa versão em **C++** do mesmo algoritmo, com threads: as decisões são as mesmas, de 35 a 80 vezes mais rápidas.

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
- Para o **Turbo**: no Windows 64 bits nada a mais, porque a biblioteca C++ já vem compilada; no Linux, compilar uma
  vez (veja [Modo Turbo](#modo-turbo-c))

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
  A partir da profundidade 5, os movimentos da raiz são calculados em paralelo, em processos separados. Sem o Turbo,
  as profundidades altas são lentas: no labirinto 17 × 17, a primeira jogada leva cerca de 4 s na profundidade 7, 33 s
  na 9 e 1,5 min na 10 (no 13 × 13, a profundidade 10 levou 5 s). Uma busca em andamento não pode ser cancelada.
- **Estratégia do Laranja**: Minimax (com profundidade própria), Guloso ou Aleatório.
- **Turbo**: ligado, o Minimax dos dois agentes roda em C++ (a profundidade 10 cai de 88 s para 2,6 s); desligado,
  roda em Python. As decisões são idênticas. As jogadas calculadas em C++ aparecem com o selo **C++** no tempo. Se a
  biblioteca C++ não estiver compilada, o interruptor fica desativado e explica o motivo.
- **Usar poda alfa-beta**: liga ou desliga a otimização (o resultado é o mesmo; muda a quantidade de nós visitados).
  Sem poda e com profundidade 5 ou mais, cada jogada pode levar vários segundos.
- **Mostrar território**: pinta cada célula livre com a cor de quem chega nela primeiro. É exatamente o que a função de avaliação do Minimax mede.

No modal da árvore:

- **Clique em um nó** para abrir ou fechar os filhos e ver os detalhes no painel da direita (tabuleiro daquele momento, valor, janela alfa-beta e o motivo da escolha).
- **Expandir caminho escolhido**, **Expandir mais um nível**, **Recolher tudo** e **zoom** (− / +).
- Troque o **Agente** para ver a árvore do Laranja, quando ele também usa Minimax.
- A árvore é desenhada até a profundidade 5. Acima disso ela passa de centenas de milhares de nós, e o modal mostra um
  aviso.
- Com o Turbo, a árvore é refeita em Python com a mesma busca que o C++ fez, então os números batem com a decisão.

## Como rodar os testes

Dentro da pasta `minimax`:

```bash
python -m unittest -v
```

São 36 testes (`unittest`, da biblioteca padrão) cobrindo a geração do labirinto, as regras do jogo, a função de
avaliação, o Minimax, a poda alfa-beta, a busca com a raiz em paralelo, o modo Turbo (C++ igual ao Python), partidas
completas e a API usada pela página. Os 3 testes do C++ aparecem como `skipped` se a biblioteca não estiver compilada.

## Modo Turbo (C++)

O mesmo Minimax também está escrito em C++ (`logica/minimax.cpp`) e é chamado pelo Python com `ctypes`
(`logica/minimax_cpp_wrapper.py`). O interruptor **Turbo** da página escolhe qual versão calcula as jogadas.

- **Windows 64 bits**: a biblioteca `logica/minimax_cpp_lib.dll` já vem compilada e não depende de nada instalado.
- **Linux (ou WSL)**: compile uma vez para gerar `logica/minimax_cpp_lib.so`.

Para compilar (ou recompilar depois de mudar o `minimax.cpp`), dentro da pasta `minimax` e com o servidor parado:

```bash
python compilar_cpp.py
```

O script usa, no Windows, as **Ferramentas de Build do Visual Studio** com o compilador C++ (carga de trabalho
"Desenvolvimento para desktop com C++") e, no Linux, o `g++` (no Ubuntu: `sudo apt install g++`). No fim ele confere se
a biblioteca nova carrega.

## Estrutura dos arquivos

```
minimax/
├── servidor.py                   Servidor HTTP: entrega a página e responde à API
├── compilar_cpp.py               Compila a versão em C++ usada pelo Turbo
├── logica/                       O algoritmo, em Python (e em C++ para o Turbo)
│   ├── tabuleiro.py              Células, direções e vizinhos de cada posição do grid
│   ├── labirinto.py              Geração aleatória e simétrica do labirinto
│   ├── jogo.py                   Estado da partida, movimentos, colisões e fazer/desfazer rodada
│   ├── avaliacao.py              Função de avaliação (território por busca em largura)
│   ├── minimax.py                Minimax com poda alfa-beta, raiz em paralelo e registro da árvore
│   ├── estrategias.py            Agentes: Minimax (em Python ou em C++), Guloso e Aleatório
│   ├── partida.py                Rodadas, simulação de partidas e reconstrução da árvore
│   ├── api.py                    Converte pedidos e respostas da página para JSON
│   ├── minimax.cpp               O Minimax em C++, com uma thread por movimento da raiz (Turbo)
│   ├── minimax_cpp_wrapper.py    Chama a versão em C++ a partir do Python (ctypes)
│   └── minimax_cpp_lib.dll       Versão em C++ já compilada para Windows 64 bits
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
