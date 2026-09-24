import random
from dataclasses import dataclass
from typing import Callable

from .avaliacao import contar_espaco_alcancavel
from .jogo import Estado, movimentos_possiveis
from .minimax import buscar_melhor_movimento
from .minimax_cpp_wrapper import buscar_melhor_movimento_cpp
from .tabuleiro import vizinho_na_direcao

MOTOR_PYTHON = "python"
MOTOR_CPP = "cpp"


@dataclass(frozen=True)
class ConfiguracaoDoAgente:
    estrategia: str
    profundidade_em_rodadas: int = 1
    usar_poda_alfa_beta: bool = True
    usar_turbo: bool = False


@dataclass(frozen=True)
class DecisaoDoAgente:
    estrategia: str
    movimento: str
    valor: float | None = None
    nos_visitados: int | None = None
    ramos_podados: int | None = None
    tempo_em_milissegundos: float | None = None
    motor: str | None = None


@dataclass(frozen=True)
class Estrategia:
    nome: str
    usa_profundidade: bool
    decidir: Callable[[Estado, str, ConfiguracaoDoAgente, random.Random], DecisaoDoAgente]


def _decidir_com_minimax(
    estado: Estado, jogador: str, configuracao: ConfiguracaoDoAgente, gerador_aleatorio: random.Random
) -> DecisaoDoAgente:
    buscar = buscar_melhor_movimento_cpp if configuracao.usar_turbo else buscar_melhor_movimento
    resultado = buscar(estado, jogador, configuracao.profundidade_em_rodadas, configuracao.usar_poda_alfa_beta)
    return DecisaoDoAgente(
        estrategia="minimax",
        movimento=resultado.movimento,
        valor=resultado.valor,
        nos_visitados=resultado.nos_visitados,
        ramos_podados=resultado.ramos_podados,
        tempo_em_milissegundos=resultado.tempo_em_milissegundos,
        motor=MOTOR_CPP if configuracao.usar_turbo else MOTOR_PYTHON,
    )


def _decidir_com_estrategia_gulosa(
    estado: Estado, jogador: str, configuracao: ConfiguracaoDoAgente, gerador_aleatorio: random.Random
) -> DecisaoDoAgente:
    def espaco_depois_do_movimento(movimento: str) -> int:
        destino = vizinho_na_direcao(estado.tamanho, estado.posicoes[jogador], movimento)
        return contar_espaco_alcancavel(estado, destino)

    movimentos = movimentos_possiveis(estado, jogador)
    espacos = [espaco_depois_do_movimento(movimento) for movimento in movimentos]
    maior_espaco = max(espacos)
    movimento_escolhido = movimentos[espacos.index(maior_espaco)]
    return DecisaoDoAgente(estrategia="guloso", movimento=movimento_escolhido, valor=maior_espaco)


def _decidir_aleatoriamente(
    estado: Estado, jogador: str, configuracao: ConfiguracaoDoAgente, gerador_aleatorio: random.Random
) -> DecisaoDoAgente:
    return DecisaoDoAgente(
        estrategia="aleatorio", movimento=gerador_aleatorio.choice(movimentos_possiveis(estado, jogador))
    )


ESTRATEGIAS = {
    "minimax": Estrategia("Minimax", True, _decidir_com_minimax),
    "guloso": Estrategia("Guloso (maior espaço imediato)", False, _decidir_com_estrategia_gulosa),
    "aleatorio": Estrategia("Aleatório", False, _decidir_aleatoriamente),
}


def decidir_movimento(
    estado: Estado, jogador: str, configuracao: ConfiguracaoDoAgente, gerador_aleatorio: random.Random
) -> DecisaoDoAgente:
    return ESTRATEGIAS[configuracao.estrategia].decidir(estado, jogador, configuracao, gerador_aleatorio)
