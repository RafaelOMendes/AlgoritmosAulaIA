import random
from dataclasses import dataclass

from .estrategias import ConfiguracaoDoAgente, DecisaoDoAgente, decidir_movimento
from .jogo import (
    JOGADORES,
    Estado,
    aplicar_rodada,
    aplicar_rodada_por_papel,
    criar_estado_inicial,
    descrever_causa_da_colisao,
    jogo_terminou,
)
from .labirinto import gerar_labirinto
from .minimax import ResultadoDaBusca, buscar_melhor_movimento


@dataclass(frozen=True)
class RegistroDaRodada:
    numero_da_rodada: int
    estado_antes: Estado
    estado_depois: Estado
    decisoes: dict[str, DecisaoDoAgente]
    causas_das_colisoes: dict[str, str | None]


@dataclass(frozen=True)
class PassoDoCaminho:
    jogador: str
    movimento: str


def criar_gerador_da_rodada(semente_da_partida: int, numero_da_rodada: int) -> random.Random:
    return random.Random(semente_da_partida * 100_003 + numero_da_rodada)


def jogar_rodada(
    estado: Estado,
    configuracao_dos_agentes: dict[str, ConfiguracaoDoAgente],
    gerador_aleatorio: random.Random,
) -> RegistroDaRodada:
    decisoes = {
        jogador: decidir_movimento(estado, jogador, configuracao_dos_agentes[jogador], gerador_aleatorio)
        for jogador in JOGADORES
    }
    estado_depois = aplicar_rodada(estado, decisoes["azul"].movimento, decisoes["laranja"].movimento)
    return RegistroDaRodada(
        numero_da_rodada=estado_depois.rodada,
        estado_antes=estado,
        estado_depois=estado_depois,
        decisoes=decisoes,
        causas_das_colisoes={
            jogador: descrever_causa_da_colisao(estado, estado_depois, jogador) for jogador in JOGADORES
        },
    )


def simular_partida_completa(
    tamanho: int, semente: int, configuracao_dos_agentes: dict[str, ConfiguracaoDoAgente]
) -> list[RegistroDaRodada]:
    estado = criar_estado_inicial(gerar_labirinto(tamanho, semente))
    registros = []
    while not jogo_terminou(estado):
        registro = jogar_rodada(estado, configuracao_dos_agentes, criar_gerador_da_rodada(semente, estado.rodada))
        registros.append(registro)
        estado = registro.estado_depois
    return registros


def reconstruir_arvore_de_decisao(
    estado: Estado, jogador: str, configuracao: ConfiguracaoDoAgente
) -> ResultadoDaBusca:
    return buscar_melhor_movimento(
        estado,
        jogador,
        configuracao.profundidade_em_rodadas,
        configuracao.usar_poda_alfa_beta,
        registrar_arvore=True,
        paralelizar_a_raiz=True if configuracao.usar_turbo else None,
    )


def reconstruir_estado_do_no(
    estado_raiz: Estado, caminho: list[PassoDoCaminho], jogador_maximizador: str
) -> tuple[Estado, PassoDoCaminho | None]:
    estado = estado_raiz
    for indice in range(0, len(caminho), 2):
        jogada_do_maximizador = caminho[indice]
        if indice + 1 >= len(caminho):
            return estado, jogada_do_maximizador
        jogada_do_minimizador = caminho[indice + 1]
        estado = aplicar_rodada_por_papel(
            estado, jogador_maximizador, jogada_do_maximizador.movimento, jogada_do_minimizador.movimento
        )
    return estado, None
