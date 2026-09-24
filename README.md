# Algoritmos de IA: trabalho da disciplina

Resolução de problemas com algoritmos de Inteligência Artificial. Cada algoritmo fica em uma pasta própria,
com um `README.md` explicando como rodar.

| Pasta | Algoritmo | Problema | Situação |
|---|---|---|---|
| [`minimax/`](minimax/) | Minimax (com poda alfa-beta) | Fuga no Labirinto (estilo Tron): duas motos de luz disputam espaço num labirinto aleatório, e o agente escolhe o movimento que maximiza o próprio espaço e minimiza o do oponente | Pronto |
| [`genetico/caixeiro-viajante/`](genetico/caixeiro-viajante/) | Algoritmo genético | Caixeiro Viajante: menor rota entre cidades brasileiras (ou pontos clicados) num mapa real | Pronto |
| [`genetico/design-de-interface/`](genetico/design-de-interface/) | Algoritmo genético | Design de interface mobile automático: evolui telas de celular pelas métricas de legibilidade | Pronto |

## Início rápido

Requisitos: Node.js 18 ou superior e um navegador moderno.

```bash
cd minimax
```

```bash
npm start
```

Depois abra **http://localhost:8000** no navegador.

Os projetos de algoritmo genético rodam do mesmo jeito, cada um na sua pasta (veja [`genetico/README.md`](genetico/README.md)).

Detalhes de uso, opções e testes em [`minimax/README.md`](minimax/README.md). A explicação de como o Minimax
foi usado e do que faz cada parte do código está em [`minimax/EXPLICACAO.md`](minimax/EXPLICACAO.md).
