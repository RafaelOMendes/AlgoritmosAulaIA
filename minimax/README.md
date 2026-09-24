# Minimax: guerra de preços em um duopólio

Duas empresas dominam um mercado e disputam clientes pelo preço durante várias rodadas (trimestres).
A **empresa** usa o algoritmo **Minimax** para escolher o preço que garante o **maior lucro mínimo possível**,
qualquer que seja a estratégia agressiva do **concorrente** (inclusive vender abaixo do custo, o chamado *dumping*).

O programa também implementa a **poda alfa-beta** e compara o número de nós visitados com o Minimax puro.

## Requisitos

- Python **3.10 ou superior** (testado no Python 3.14)
- Nenhuma biblioteca externa: só a biblioteca padrão do Python

Para conferir a versão instalada:

```bash
python --version
```

## Como rodar

Entre na pasta `minimax` e execute o `main.py`:

```bash
cd minimax
```

```bash
python main.py
```

Também funciona a partir da raiz do repositório:

```bash
python minimax/main.py
```

> No Windows, se o comando `python` não for reconhecido, use `py` no lugar (ex.: `py main.py`).

### Opções

| Opção | O que faz | Padrão |
|---|---|---|
| `--rodadas N` | Quantidade de rodadas da guerra de preços (1 a 5). Cada rodada adiciona 2 níveis à árvore do Minimax. | `3` |
| `--caixa-concorrente VALOR` | Dinheiro que o concorrente pode queimar vendendo abaixo do custo. | `2000` |
| `--semente N` | Semente do concorrente aleatório, para a simulação dar sempre o mesmo resultado. | `42` |
| `--detalhar` | Mostra a tabela rodada a rodada para todos os perfis de concorrente. | desligado |
| `--help` | Mostra a ajuda. | |

Exemplos:

```bash
python main.py --rodadas 4
```

```bash
python main.py --caixa-concorrente 0 --detalhar
```

Com 5 rodadas só a versão com poda alfa-beta é executada, porque a árvore do Minimax puro passaria de 10 milhões de nós.

## O que aparece na saída

1. **Lucro mínimo garantido para cada preço da primeira rodada**: o valor Minimax de cada opção de preço e a melhor escolha.
2. **Cenário pessimista**: a guerra de preços rodada a rodada quando o concorrente joga da pior forma possível para a empresa.
3. **Comparação entre perfis de concorrente**: a empresa usando Minimax contra concorrentes com comportamentos diferentes, mostrando que o lucro nunca fica abaixo da garantia.
4. **Eficiência**: nós visitados, podas e tempo do Minimax puro contra o Minimax com poda alfa-beta.

## Como rodar os testes

Dentro da pasta `minimax`:

```bash
python -m unittest -v
```

Ou a partir da raiz do repositório:

```bash
python -m unittest discover -s minimax -v
```

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `main.py` | Ponto de entrada: lê as opções da linha de comando e imprime os relatórios. |
| `mercado.py` | Modelo econômico: configuração, estado do jogo, cálculo de demanda, participação, lucro e caixa. |
| `busca_minimax.py` | O algoritmo Minimax, a versão com poda alfa-beta e as funções que escolhem a melhor jogada. |
| `perfis_concorrente.py` | Comportamentos diferentes de concorrente usados na simulação. |
| `simulacao.py` | Joga a guerra de preços rodada a rodada e registra o que aconteceu. |
| `test_minimax.py` | Testes automatizados. |
| `EXPLICACAO.md` | Explicação detalhada do problema, da modelagem e de cada parte do código. |
