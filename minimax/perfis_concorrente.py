import random
from typing import Callable

from busca_minimax import escolher_resposta_mais_agressiva_do_concorrente
from mercado import (
    ConfiguracaoDoMercado,
    EstadoDoMercado,
    calcular_resultado_da_rodada,
    precos_que_o_concorrente_consegue_bancar,
)

PerfilDoConcorrente = Callable[[ConfiguracaoDoMercado, EstadoDoMercado, random.Random], int]


def preco_bancavel_mais_proximo(precos_bancaveis: list[int], preco_desejado: float) -> int:
    return min(precos_bancaveis, key=lambda preco: (abs(preco - preco_desejado), preco))


def concorrente_agressivo_minimax(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, gerador_aleatorio: random.Random
) -> int:
    return escolher_resposta_mais_agressiva_do_concorrente(configuracao, estado).preco


def concorrente_que_maximiza_o_proprio_lucro(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, gerador_aleatorio: random.Random
) -> int:
    def lucro_do_concorrente_na_rodada(preco_do_concorrente: int) -> float:
        resultado = calcular_resultado_da_rodada(
            configuracao,
            estado.fidelidade_da_empresa,
            estado.preco_anunciado_pela_empresa,
            preco_do_concorrente,
        )
        return resultado.lucro_do_concorrente

    precos_bancaveis = precos_que_o_concorrente_consegue_bancar(configuracao, estado)
    return max(precos_bancaveis, key=lucro_do_concorrente_na_rodada)


def concorrente_que_imita_a_empresa(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, gerador_aleatorio: random.Random
) -> int:
    precos_bancaveis = precos_que_o_concorrente_consegue_bancar(configuracao, estado)
    return preco_bancavel_mais_proximo(precos_bancaveis, estado.preco_anunciado_pela_empresa)


def concorrente_que_sempre_pratica_o_menor_preco(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, gerador_aleatorio: random.Random
) -> int:
    return min(precos_que_o_concorrente_consegue_bancar(configuracao, estado))


def concorrente_aleatorio(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, gerador_aleatorio: random.Random
) -> int:
    precos_bancaveis = precos_que_o_concorrente_consegue_bancar(configuracao, estado)
    return gerador_aleatorio.choice(precos_bancaveis)


PERFIS_DE_CONCORRENTE: dict[str, PerfilDoConcorrente] = {
    "Agressivo (minimax)": concorrente_agressivo_minimax,
    "Maximiza o próprio lucro": concorrente_que_maximiza_o_proprio_lucro,
    "Imita o preço da empresa": concorrente_que_imita_a_empresa,
    "Dumping imediato (menor preço)": concorrente_que_sempre_pratica_o_menor_preco,
    "Aleatório": concorrente_aleatorio,
}
