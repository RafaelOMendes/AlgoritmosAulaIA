# Algoritmos de IA: trabalho da disciplina

Resolução de problemas com algoritmos de Inteligência Artificial. Os **algoritmos são escritos em Python** e cada
projeto tem uma página web para acompanhar a resolução. Um pequeno servidor em Python (só biblioteca padrão)
executa o algoritmo e entrega a página; o JavaScript cuida apenas da interface.

| Pasta | Algoritmo | Problema |
|---|---|---|
| [`minimax/`](minimax/) | Minimax com poda alfa-beta (raiz em paralelo a partir da profundidade 5, e uma versão experimental em C++) | Fuga no Labirinto (estilo Tron): duas motos de luz disputam espaço num labirinto aleatório, e o agente escolhe o movimento que maximiza o próprio espaço e minimiza o do oponente |
| [`genetico/`](genetico/) | Algoritmo genético | Caixeiro Viajante: a menor rota entre cidades brasileiras (ou pontos clicados) num mapa real |

## Requisitos

- Python 3.10 ou superior (sem bibliotecas externas)
- Um navegador moderno
- Internet para o mapa do Caixeiro Viajante

## Início rápido

```bash
cd minimax
```

```bash
python servidor.py
```

Depois abra **http://localhost:8000**. O genético roda do mesmo jeito, dentro da pasta `genetico`. Para deixar os
dois abertos ao mesmo tempo, use outra porta no segundo (`python servidor.py 8001`).

Cada pasta tem um `README.md` com os detalhes de uso e testes, e um `EXPLICACAO.md` com a explicação do algoritmo e
do que faz cada parte do código.
