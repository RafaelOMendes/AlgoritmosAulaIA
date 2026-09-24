from functools import lru_cache

CELULA_LIVRE = 0
CELULA_PAREDE = 1
CELULA_RASTRO_AZUL = 2
CELULA_RASTRO_LARANJA = 3

FORA_DO_TABULEIRO = -1

DESLOCAMENTO_DE_CADA_DIRECAO = {
    "cima": (-1, 0),
    "direita": (0, 1),
    "baixo": (1, 0),
    "esquerda": (0, -1),
}
ORDEM_DAS_DIRECOES = tuple(DESLOCAMENTO_DE_CADA_DIRECAO)


def indice_da_celula(tamanho: int, linha: int, coluna: int) -> int:
    return linha * tamanho + coluna


def linha_do_indice(tamanho: int, indice: int) -> int:
    return indice // tamanho


def coluna_do_indice(tamanho: int, indice: int) -> int:
    return indice % tamanho


def posicao_esta_dentro_do_tabuleiro(tamanho: int, linha: int, coluna: int) -> bool:
    return 0 <= linha < tamanho and 0 <= coluna < tamanho


def indice_espelhado(tamanho: int, indice: int) -> int:
    return tamanho * tamanho - 1 - indice


@lru_cache(maxsize=None)
def tabela_de_vizinhos_por_direcao(tamanho: int) -> tuple[dict[str, int], ...]:
    tabela = []
    for indice in range(tamanho * tamanho):
        linha = linha_do_indice(tamanho, indice)
        coluna = coluna_do_indice(tamanho, indice)
        vizinhos = {}
        for direcao, (delta_da_linha, delta_da_coluna) in DESLOCAMENTO_DE_CADA_DIRECAO.items():
            linha_vizinha = linha + delta_da_linha
            coluna_vizinha = coluna + delta_da_coluna
            if posicao_esta_dentro_do_tabuleiro(tamanho, linha_vizinha, coluna_vizinha):
                vizinhos[direcao] = indice_da_celula(tamanho, linha_vizinha, coluna_vizinha)
            else:
                vizinhos[direcao] = FORA_DO_TABULEIRO
        tabela.append(vizinhos)
    return tuple(tabela)


@lru_cache(maxsize=None)
def tabela_de_vizinhos_dentro_do_tabuleiro(tamanho: int) -> tuple[tuple[int, ...], ...]:
    return tuple(
        tuple(vizinho for vizinho in vizinhos.values() if vizinho != FORA_DO_TABULEIRO)
        for vizinhos in tabela_de_vizinhos_por_direcao(tamanho)
    )


def vizinho_na_direcao(tamanho: int, indice: int, direcao: str) -> int:
    return tabela_de_vizinhos_por_direcao(tamanho)[indice][direcao]
