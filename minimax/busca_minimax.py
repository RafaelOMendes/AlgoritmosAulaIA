import math
from dataclasses import dataclass

from mercado import (
    ConfiguracaoDoMercado,
    EstadoDoMercado,
    anunciar_preco_da_empresa,
    aplicar_resposta_do_concorrente,
    e_a_vez_da_empresa,
    jogo_terminou,
    precos_que_o_concorrente_consegue_bancar,
)


@dataclass
class EstatisticasDaBusca:
    nos_visitados: int = 0
    podas_realizadas: int = 0


@dataclass(frozen=True)
class AvaliacaoDeJogada:
    preco: int
    lucro_minimo_garantido: float


def gerar_jogadas_possiveis(configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado) -> list[int]:
    if e_a_vez_da_empresa(estado):
        return list(configuracao.precos_possiveis)
    return precos_que_o_concorrente_consegue_bancar(configuracao, estado)


def aplicar_jogada(configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado, preco: int) -> EstadoDoMercado:
    if e_a_vez_da_empresa(estado):
        return anunciar_preco_da_empresa(estado, preco)
    return aplicar_resposta_do_concorrente(configuracao, estado, preco)


def avaliar_estado_final(estado: EstadoDoMercado) -> float:
    return estado.lucro_acumulado_da_empresa


def minimax(
    configuracao: ConfiguracaoDoMercado,
    estado: EstadoDoMercado,
    estatisticas: EstatisticasDaBusca,
) -> float:
    estatisticas.nos_visitados += 1

    if jogo_terminou(configuracao, estado):
        return avaliar_estado_final(estado)

    if e_a_vez_da_empresa(estado):
        maior_lucro_garantido = -math.inf
        for preco_da_empresa in gerar_jogadas_possiveis(configuracao, estado):
            proximo_estado = aplicar_jogada(configuracao, estado, preco_da_empresa)
            valor = minimax(configuracao, proximo_estado, estatisticas)
            maior_lucro_garantido = max(maior_lucro_garantido, valor)
        return maior_lucro_garantido

    menor_lucro_possivel = math.inf
    for preco_do_concorrente in gerar_jogadas_possiveis(configuracao, estado):
        proximo_estado = aplicar_jogada(configuracao, estado, preco_do_concorrente)
        valor = minimax(configuracao, proximo_estado, estatisticas)
        menor_lucro_possivel = min(menor_lucro_possivel, valor)
    return menor_lucro_possivel


def minimax_com_poda_alfa_beta(
    configuracao: ConfiguracaoDoMercado,
    estado: EstadoDoMercado,
    alfa: float,
    beta: float,
    estatisticas: EstatisticasDaBusca,
) -> float:
    estatisticas.nos_visitados += 1

    if jogo_terminou(configuracao, estado):
        return avaliar_estado_final(estado)

    if e_a_vez_da_empresa(estado):
        maior_lucro_garantido = -math.inf
        for preco_da_empresa in gerar_jogadas_possiveis(configuracao, estado):
            proximo_estado = aplicar_jogada(configuracao, estado, preco_da_empresa)
            valor = minimax_com_poda_alfa_beta(configuracao, proximo_estado, alfa, beta, estatisticas)
            maior_lucro_garantido = max(maior_lucro_garantido, valor)
            alfa = max(alfa, maior_lucro_garantido)
            if alfa >= beta:
                estatisticas.podas_realizadas += 1
                break
        return maior_lucro_garantido

    menor_lucro_possivel = math.inf
    for preco_do_concorrente in gerar_jogadas_possiveis(configuracao, estado):
        proximo_estado = aplicar_jogada(configuracao, estado, preco_do_concorrente)
        valor = minimax_com_poda_alfa_beta(configuracao, proximo_estado, alfa, beta, estatisticas)
        menor_lucro_possivel = min(menor_lucro_possivel, valor)
        beta = min(beta, menor_lucro_possivel)
        if alfa >= beta:
            estatisticas.podas_realizadas += 1
            break
    return menor_lucro_possivel


def calcular_valor_do_estado(
    configuracao: ConfiguracaoDoMercado,
    estado: EstadoDoMercado,
    usar_poda_alfa_beta: bool = True,
) -> tuple[float, EstatisticasDaBusca]:
    estatisticas = EstatisticasDaBusca()
    if usar_poda_alfa_beta:
        valor = minimax_com_poda_alfa_beta(configuracao, estado, -math.inf, math.inf, estatisticas)
    else:
        valor = minimax(configuracao, estado, estatisticas)
    return valor, estatisticas


def avaliar_jogadas_possiveis(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado
) -> list[AvaliacaoDeJogada]:
    avaliacoes = []
    for preco in gerar_jogadas_possiveis(configuracao, estado):
        proximo_estado = aplicar_jogada(configuracao, estado, preco)
        valor, _ = calcular_valor_do_estado(configuracao, proximo_estado)
        avaliacoes.append(AvaliacaoDeJogada(preco=preco, lucro_minimo_garantido=valor))
    return avaliacoes


def escolher_preco_da_empresa(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado
) -> AvaliacaoDeJogada:
    avaliacoes = avaliar_jogadas_possiveis(configuracao, estado)
    return max(avaliacoes, key=lambda avaliacao: avaliacao.lucro_minimo_garantido)


def escolher_resposta_mais_agressiva_do_concorrente(
    configuracao: ConfiguracaoDoMercado, estado: EstadoDoMercado
) -> AvaliacaoDeJogada:
    avaliacoes = avaliar_jogadas_possiveis(configuracao, estado)
    return min(avaliacoes, key=lambda avaliacao: avaliacao.lucro_minimo_garantido)
