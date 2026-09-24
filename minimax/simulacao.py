import random
from dataclasses import dataclass

from busca_minimax import escolher_preco_da_empresa
from mercado import (
    ConfiguracaoDoMercado,
    ResultadoDaRodada,
    anunciar_preco_da_empresa,
    aplicar_resposta_do_concorrente,
    calcular_resultado_da_rodada,
    criar_estado_inicial,
    jogo_terminou,
)
from perfis_concorrente import PerfilDoConcorrente


@dataclass(frozen=True)
class RegistroDaRodada:
    numero_da_rodada: int
    preco_da_empresa: int
    preco_do_concorrente: int
    lucro_minimo_garantido_antes_da_rodada: float
    resultado: ResultadoDaRodada
    fidelidade_apos_a_rodada: float
    caixa_do_concorrente_apos_a_rodada: float


@dataclass(frozen=True)
class ResultadoDaSimulacao:
    nome_do_perfil: str
    rodadas: tuple[RegistroDaRodada, ...]
    lucro_minimo_garantido_no_inicio: float
    lucro_total_da_empresa: float
    lucro_total_do_concorrente: float


def simular_guerra_de_precos(
    configuracao: ConfiguracaoDoMercado,
    nome_do_perfil: str,
    perfil_do_concorrente: PerfilDoConcorrente,
    semente_aleatoria: int,
) -> ResultadoDaSimulacao:
    gerador_aleatorio = random.Random(semente_aleatoria)
    estado = criar_estado_inicial(configuracao)
    registros = []
    lucro_minimo_garantido_no_inicio = None

    while not jogo_terminou(configuracao, estado):
        decisao_da_empresa = escolher_preco_da_empresa(configuracao, estado)
        if lucro_minimo_garantido_no_inicio is None:
            lucro_minimo_garantido_no_inicio = decisao_da_empresa.lucro_minimo_garantido

        estado_com_preco_anunciado = anunciar_preco_da_empresa(estado, decisao_da_empresa.preco)
        preco_do_concorrente = perfil_do_concorrente(configuracao, estado_com_preco_anunciado, gerador_aleatorio)

        resultado = calcular_resultado_da_rodada(
            configuracao, estado.fidelidade_da_empresa, decisao_da_empresa.preco, preco_do_concorrente
        )
        estado = aplicar_resposta_do_concorrente(configuracao, estado_com_preco_anunciado, preco_do_concorrente)

        registros.append(
            RegistroDaRodada(
                numero_da_rodada=estado.rodada_atual,
                preco_da_empresa=decisao_da_empresa.preco,
                preco_do_concorrente=preco_do_concorrente,
                lucro_minimo_garantido_antes_da_rodada=decisao_da_empresa.lucro_minimo_garantido,
                resultado=resultado,
                fidelidade_apos_a_rodada=estado.fidelidade_da_empresa,
                caixa_do_concorrente_apos_a_rodada=estado.caixa_do_concorrente,
            )
        )

    return ResultadoDaSimulacao(
        nome_do_perfil=nome_do_perfil,
        rodadas=tuple(registros),
        lucro_minimo_garantido_no_inicio=lucro_minimo_garantido_no_inicio,
        lucro_total_da_empresa=estado.lucro_acumulado_da_empresa,
        lucro_total_do_concorrente=estado.lucro_acumulado_do_concorrente,
    )
