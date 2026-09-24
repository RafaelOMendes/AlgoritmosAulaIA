import random
from collections import deque
from dataclasses import dataclass

from .tabuleiro import (
    CELULA_LIVRE,
    CELULA_PAREDE,
    coluna_do_indice,
    indice_da_celula,
    indice_espelhado,
    linha_do_indice,
    posicao_esta_dentro_do_tabuleiro,
    tabela_de_vizinhos_dentro_do_tabuleiro,
)

TAMANHO_MINIMO_DO_LABIRINTO = 9
DENSIDADE_DE_PAREDES = 0.2
DISTANCIA_LIVRE_AO_REDOR_DOS_JOGADORES = 2
COMPRIMENTO_MINIMO_DE_PAREDE = 2
COMPRIMENTO_MAXIMO_DE_PAREDE = 5
LIMITE_DE_TENTATIVAS_DE_GERACAO = 50


@dataclass(frozen=True)
class Labirinto:
    tamanho: int
    semente: int
    celulas: bytes
    posicoes_iniciais: dict[str, int]


def calcular_posicoes_iniciais(tamanho: int) -> dict[str, int]:
    linha_do_meio = tamanho // 2
    indice_do_azul = indice_da_celula(tamanho, linha_do_meio, 2)
    return {"azul": indice_do_azul, "laranja": indice_espelhado(tamanho, indice_do_azul)}


def _distancia_de_manhattan(tamanho: int, indice_a: int, indice_b: int) -> int:
    return abs(linha_do_indice(tamanho, indice_a) - linha_do_indice(tamanho, indice_b)) + abs(
        coluna_do_indice(tamanho, indice_a) - coluna_do_indice(tamanho, indice_b)
    )


def _celula_esta_protegida(tamanho: int, indice: int, posicoes_iniciais: dict[str, int]) -> bool:
    return any(
        _distancia_de_manhattan(tamanho, indice, posicao_inicial) <= DISTANCIA_LIVRE_AO_REDOR_DOS_JOGADORES
        for posicao_inicial in posicoes_iniciais.values()
    )


def _sortear_paredes_simetricas(
    tamanho: int, posicoes_iniciais: dict[str, int], gerador_aleatorio: random.Random
) -> bytearray:
    celulas = bytearray(tamanho * tamanho)
    quantidade_de_paredes_desejada = int(tamanho * tamanho * DENSIDADE_DE_PAREDES)
    limite_de_sorteios = tamanho * tamanho * 4
    quantidade_de_paredes = 0

    for _ in range(limite_de_sorteios):
        if quantidade_de_paredes >= quantidade_de_paredes_desejada:
            break
        linha_inicial = gerador_aleatorio.randint(0, tamanho - 1)
        coluna_inicial = gerador_aleatorio.randint(0, tamanho - 1)
        parede_horizontal = gerador_aleatorio.random() < 0.5
        comprimento = gerador_aleatorio.randint(COMPRIMENTO_MINIMO_DE_PAREDE, COMPRIMENTO_MAXIMO_DE_PAREDE)

        for passo in range(comprimento):
            linha = linha_inicial if parede_horizontal else linha_inicial + passo
            coluna = coluna_inicial + passo if parede_horizontal else coluna_inicial
            if not posicao_esta_dentro_do_tabuleiro(tamanho, linha, coluna):
                break
            indice = indice_da_celula(tamanho, linha, coluna)
            if _celula_esta_protegida(tamanho, indice, posicoes_iniciais):
                continue
            for celula_da_parede in {indice, indice_espelhado(tamanho, indice)}:
                if celulas[celula_da_parede] != CELULA_PAREDE:
                    celulas[celula_da_parede] = CELULA_PAREDE
                    quantidade_de_paredes += 1
    return celulas


def encontrar_celulas_alcancaveis(tamanho: int, celulas: bytes | bytearray, origem: int) -> set[int]:
    vizinhos = tabela_de_vizinhos_dentro_do_tabuleiro(tamanho)
    alcancaveis = {origem}
    fila = deque([origem])
    while fila:
        celula_atual = fila.popleft()
        for vizinho in vizinhos[celula_atual]:
            if vizinho not in alcancaveis and celulas[vizinho] == CELULA_LIVRE:
                alcancaveis.add(vizinho)
                fila.append(vizinho)
    return alcancaveis


def _fechar_bolsoes_isolados(tamanho: int, celulas: bytearray, posicoes_iniciais: dict[str, int]) -> bool:
    alcancaveis_pelo_azul = encontrar_celulas_alcancaveis(tamanho, celulas, posicoes_iniciais["azul"])
    if posicoes_iniciais["laranja"] not in alcancaveis_pelo_azul:
        return False
    for indice in range(len(celulas)):
        if celulas[indice] == CELULA_LIVRE and indice not in alcancaveis_pelo_azul:
            celulas[indice] = CELULA_PAREDE
    return True


def gerar_labirinto(tamanho: int, semente: int) -> Labirinto:
    if tamanho < TAMANHO_MINIMO_DO_LABIRINTO:
        raise ValueError(f"O labirinto precisa ter pelo menos {TAMANHO_MINIMO_DO_LABIRINTO} células de lado.")
    gerador_aleatorio = random.Random(semente)
    posicoes_iniciais = calcular_posicoes_iniciais(tamanho)

    for _ in range(LIMITE_DE_TENTATIVAS_DE_GERACAO):
        celulas = _sortear_paredes_simetricas(tamanho, posicoes_iniciais, gerador_aleatorio)
        if _fechar_bolsoes_isolados(tamanho, celulas, posicoes_iniciais):
            return Labirinto(tamanho, semente, bytes(celulas), posicoes_iniciais)
    raise RuntimeError("Não foi possível gerar um labirinto conectado. Tente outra semente.")
