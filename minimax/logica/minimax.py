import concurrent.futures
import math
import signal
import threading
import time
from dataclasses import dataclass, field

from .avaliacao import AvaliacaoDaPosicao, avaliar_posicao
from .jogo import (
    Estado,
    desfazer_rodada_in_place,
    fazer_rodada_por_papel_in_place,
    jogo_terminou,
    movimentos_possiveis,
    oponente_de,
)
from .tabuleiro import ORDEM_DAS_DIRECOES

VALOR_DE_VITORIA = 1000
VALOR_DE_EMPATE = -VALOR_DE_VITORIA // 2

PROFUNDIDADE_MINIMA_PARA_PARALELIZAR = 5

NO_MAX = "MAX"
NO_MIN = "MIN"

VALOR_EXATO = "exato"
LIMITE_SUPERIOR = "limiteSuperior"
LIMITE_INFERIOR = "limiteInferior"

DESFECHO_VITORIA = "vitoria"
DESFECHO_DERROTA = "derrota"
DESFECHO_EMPATE = "empate"


@dataclass
class NoDaArvore:
    tipo: str
    jogador_da_vez: str
    jogador_que_moveu: str | None
    movimento: str | None
    alfa_na_entrada: float | None
    beta_na_entrada: float | None
    valor: float | None = None
    tipo_do_valor: str = VALOR_EXATO
    filhos: list["NoDaArvore"] = field(default_factory=list)
    indice_do_melhor_filho: int = -1
    podado: bool = False
    desfecho: str | None = None
    avaliacao: AvaliacaoDaPosicao | None = None


@dataclass
class ContextoDaBusca:
    jogador_maximizador: str
    jogador_minimizador: str
    usar_poda_alfa_beta: bool
    nos_visitados: int = 0
    ramos_podados: int = 0


@dataclass(frozen=True)
class ResultadoDaBusca:
    jogador_maximizador: str
    profundidade_em_rodadas: int
    usar_poda_alfa_beta: bool
    movimento: str
    valor: float
    nos_visitados: int
    ramos_podados: int
    tempo_em_milissegundos: float
    arvore: NoDaArvore | None


@dataclass(frozen=True)
class RamoDaRaiz:
    jogador_maximizador: str
    movimento_do_maximizador: str
    estado: Estado
    profundidade_em_rodadas: int
    usar_poda_alfa_beta: bool
    registrar_arvore: bool


@dataclass(frozen=True)
class ResultadoDoRamoDaRaiz:
    valor: float
    nos_visitados: int
    ramos_podados: int
    no: NoDaArvore | None


_executor_de_processos: concurrent.futures.ProcessPoolExecutor | None = None
_trava_do_executor = threading.Lock()


def _criar_no_filho(
    contexto: ContextoDaBusca, no_pai: NoDaArvore | None, tipo_do_filho: str, movimento: str, alfa: float, beta: float
) -> NoDaArvore | None:
    if no_pai is None:
        return None
    jogador_da_vez = contexto.jogador_maximizador if tipo_do_filho == NO_MAX else contexto.jogador_minimizador
    no_filho = NoDaArvore(
        tipo=tipo_do_filho,
        jogador_da_vez=jogador_da_vez,
        jogador_que_moveu=no_pai.jogador_da_vez,
        movimento=movimento,
        alfa_na_entrada=alfa,
        beta_na_entrada=beta,
    )
    no_pai.filhos.append(no_filho)
    return no_filho


def _registrar_ramos_podados(
    contexto: ContextoDaBusca, no_pai: NoDaArvore | None, tipo_dos_filhos: str, movimentos_podados: list[str]
) -> None:
    contexto.ramos_podados += len(movimentos_podados)
    for movimento in movimentos_podados:
        no_podado = _criar_no_filho(contexto, no_pai, tipo_dos_filhos, movimento, None, None)
        if no_podado is not None:
            no_podado.podado = True


def _classificar_valor(valor: float, alfa_na_entrada: float, beta_na_entrada: float) -> str:
    if valor <= alfa_na_entrada:
        return LIMITE_SUPERIOR
    if valor >= beta_na_entrada:
        return LIMITE_INFERIOR
    return VALOR_EXATO


def _concluir_no_interno(
    no: NoDaArvore | None, valor: float, alfa_na_entrada: float, beta_na_entrada: float, indice_do_melhor_filho: int
) -> None:
    if no is None:
        return
    no.valor = valor
    no.tipo_do_valor = _classificar_valor(valor, alfa_na_entrada, beta_na_entrada)
    no.indice_do_melhor_filho = indice_do_melhor_filho


def _avaliar_fim_de_jogo(contexto: ContextoDaBusca, estado: Estado, rodadas_restantes: int) -> tuple[int, str]:
    maximizador_vivo = estado.vivos[contexto.jogador_maximizador]
    minimizador_vivo = estado.vivos[contexto.jogador_minimizador]
    if maximizador_vivo and not minimizador_vivo:
        return VALOR_DE_VITORIA + rodadas_restantes, DESFECHO_VITORIA
    if not maximizador_vivo and minimizador_vivo:
        return -VALOR_DE_VITORIA - rodadas_restantes, DESFECHO_DERROTA
    return VALOR_DE_EMPATE, DESFECHO_EMPATE


def _valor_no_maximizador(
    contexto: ContextoDaBusca,
    estado: Estado,
    rodadas_restantes: int,
    alfa: float,
    beta: float,
    no: NoDaArvore | None,
) -> tuple[float, str | None]:
    contexto.nos_visitados += 1

    if jogo_terminou(estado):
        valor, desfecho = _avaliar_fim_de_jogo(contexto, estado, rodadas_restantes)
        if no is not None:
            no.valor = valor
            no.desfecho = desfecho
        return valor, None

    if rodadas_restantes == 0:
        avaliacao = avaliar_posicao(estado, contexto.jogador_maximizador)
        if no is not None:
            no.valor = avaliacao.valor
            no.avaliacao = avaliacao
        return avaliacao.valor, None

    alfa_na_entrada = alfa
    movimentos = movimentos_possiveis(estado, contexto.jogador_maximizador)
    melhor_valor = -math.inf
    melhor_movimento = None
    indice_do_melhor_filho = -1

    for indice, movimento in enumerate(movimentos):
        no_filho = _criar_no_filho(contexto, no, NO_MIN, movimento, alfa, beta)
        valor, _ = _valor_no_minimizador(contexto, estado, movimento, rodadas_restantes, alfa, beta, no_filho)

        if valor > melhor_valor:
            melhor_valor = valor
            melhor_movimento = movimento
            indice_do_melhor_filho = indice

        if contexto.usar_poda_alfa_beta:
            alfa = max(alfa, melhor_valor)
            if alfa >= beta:
                _registrar_ramos_podados(contexto, no, NO_MIN, movimentos[indice + 1 :])
                break

    _concluir_no_interno(no, melhor_valor, alfa_na_entrada, beta, indice_do_melhor_filho)
    return melhor_valor, melhor_movimento


def _valor_no_minimizador(
    contexto: ContextoDaBusca,
    estado: Estado,
    movimento_do_maximizador: str,
    rodadas_restantes: int,
    alfa: float,
    beta: float,
    no: NoDaArvore | None,
) -> tuple[float, str | None]:
    contexto.nos_visitados += 1

    beta_na_entrada = beta
    movimentos = movimentos_possiveis(estado, contexto.jogador_minimizador)
    menor_valor = math.inf
    melhor_movimento = None
    indice_do_melhor_filho = -1

    for indice, movimento in enumerate(movimentos):
        reversao = fazer_rodada_por_papel_in_place(
            estado, contexto.jogador_maximizador, movimento_do_maximizador, movimento
        )
        no_filho = _criar_no_filho(contexto, no, NO_MAX, movimento, alfa, beta)
        valor, _ = _valor_no_maximizador(contexto, estado, rodadas_restantes - 1, alfa, beta, no_filho)
        desfazer_rodada_in_place(estado, reversao)

        if valor < menor_valor:
            menor_valor = valor
            melhor_movimento = movimento
            indice_do_melhor_filho = indice

        if contexto.usar_poda_alfa_beta:
            beta = min(beta, menor_valor)
            if alfa >= beta:
                _registrar_ramos_podados(contexto, no, NO_MAX, movimentos[indice + 1 :])
                break

    _concluir_no_interno(no, menor_valor, alfa, beta_na_entrada, indice_do_melhor_filho)
    return menor_valor, melhor_movimento


def _avaliar_ramo_da_raiz(ramo: RamoDaRaiz) -> ResultadoDoRamoDaRaiz:
    jogador_minimizador = oponente_de(ramo.jogador_maximizador)
    contexto = ContextoDaBusca(
        jogador_maximizador=ramo.jogador_maximizador,
        jogador_minimizador=jogador_minimizador,
        usar_poda_alfa_beta=ramo.usar_poda_alfa_beta,
    )
    no_do_ramo = (
        NoDaArvore(
            tipo=NO_MIN,
            jogador_da_vez=jogador_minimizador,
            jogador_que_moveu=ramo.jogador_maximizador,
            movimento=ramo.movimento_do_maximizador,
            alfa_na_entrada=-math.inf,
            beta_na_entrada=math.inf,
        )
        if ramo.registrar_arvore
        else None
    )
    valor, _ = _valor_no_minimizador(
        contexto,
        ramo.estado,
        ramo.movimento_do_maximizador,
        ramo.profundidade_em_rodadas,
        -math.inf,
        math.inf,
        no_do_ramo,
    )
    return ResultadoDoRamoDaRaiz(valor, contexto.nos_visitados, contexto.ramos_podados, no_do_ramo)


def _ignorar_ctrl_c_nos_processos_auxiliares() -> None:
    signal.signal(signal.SIGINT, signal.SIG_IGN)


def _obter_executor_de_processos() -> concurrent.futures.ProcessPoolExecutor:
    global _executor_de_processos
    with _trava_do_executor:
        if _executor_de_processos is None:
            _executor_de_processos = concurrent.futures.ProcessPoolExecutor(
                max_workers=len(ORDEM_DAS_DIRECOES),
                initializer=_ignorar_ctrl_c_nos_processos_auxiliares,
            )
        return _executor_de_processos


def _descartar_executor_com_defeito(executor: concurrent.futures.ProcessPoolExecutor) -> None:
    global _executor_de_processos
    with _trava_do_executor:
        if _executor_de_processos is executor:
            _executor_de_processos = None
    executor.shutdown(wait=False, cancel_futures=True)


def deve_paralelizar_a_raiz(profundidade_em_rodadas: int) -> bool:
    return profundidade_em_rodadas >= PROFUNDIDADE_MINIMA_PARA_PARALELIZAR


def _buscar_com_a_raiz_em_paralelo(
    contexto: ContextoDaBusca,
    estado: Estado,
    movimentos: list[str],
    profundidade_em_rodadas: int,
    raiz: NoDaArvore | None,
) -> tuple[float, str | None]:
    ramos = [
        RamoDaRaiz(
            jogador_maximizador=contexto.jogador_maximizador,
            movimento_do_maximizador=movimento,
            estado=estado,
            profundidade_em_rodadas=profundidade_em_rodadas,
            usar_poda_alfa_beta=contexto.usar_poda_alfa_beta,
            registrar_arvore=raiz is not None,
        )
        for movimento in movimentos
    ]
    executor = _obter_executor_de_processos()
    try:
        resultados = list(executor.map(_avaliar_ramo_da_raiz, ramos))
    except (concurrent.futures.BrokenExecutor, OSError):
        _descartar_executor_com_defeito(executor)
        return _valor_no_maximizador(contexto, estado, profundidade_em_rodadas, -math.inf, math.inf, raiz)

    contexto.nos_visitados += 1
    melhor_valor = -math.inf
    melhor_movimento = None
    indice_do_melhor_filho = -1
    for indice, (movimento, resultado) in enumerate(zip(movimentos, resultados)):
        contexto.nos_visitados += resultado.nos_visitados
        contexto.ramos_podados += resultado.ramos_podados
        if raiz is not None:
            raiz.filhos.append(resultado.no)
        if resultado.valor > melhor_valor:
            melhor_valor = resultado.valor
            melhor_movimento = movimento
            indice_do_melhor_filho = indice

    _concluir_no_interno(raiz, melhor_valor, -math.inf, math.inf, indice_do_melhor_filho)
    return melhor_valor, melhor_movimento


def buscar_melhor_movimento(
    estado: Estado,
    jogador_maximizador: str,
    profundidade_em_rodadas: int,
    usar_poda_alfa_beta: bool = True,
    registrar_arvore: bool = False,
    paralelizar_a_raiz: bool | None = None,
) -> ResultadoDaBusca:
    contexto = ContextoDaBusca(
        jogador_maximizador=jogador_maximizador,
        jogador_minimizador=oponente_de(jogador_maximizador),
        usar_poda_alfa_beta=usar_poda_alfa_beta,
    )
    raiz = (
        NoDaArvore(
            tipo=NO_MAX,
            jogador_da_vez=jogador_maximizador,
            jogador_que_moveu=None,
            movimento=None,
            alfa_na_entrada=-math.inf,
            beta_na_entrada=math.inf,
        )
        if registrar_arvore
        else None
    )
    if paralelizar_a_raiz is None:
        paralelizar_a_raiz = deve_paralelizar_a_raiz(profundidade_em_rodadas)
    movimentos_da_raiz = movimentos_possiveis(estado, jogador_maximizador)
    vale_a_pena_paralelizar = (
        paralelizar_a_raiz
        and profundidade_em_rodadas > 0
        and not jogo_terminou(estado)
        and len(movimentos_da_raiz) > 1
    )

    inicio = time.perf_counter()
    if vale_a_pena_paralelizar:
        valor, melhor_movimento = _buscar_com_a_raiz_em_paralelo(
            contexto, estado, movimentos_da_raiz, profundidade_em_rodadas, raiz
        )
    else:
        valor, melhor_movimento = _valor_no_maximizador(
            contexto, estado, profundidade_em_rodadas, -math.inf, math.inf, raiz
        )
    tempo_em_milissegundos = (time.perf_counter() - inicio) * 1000

    return ResultadoDaBusca(
        jogador_maximizador=jogador_maximizador,
        profundidade_em_rodadas=profundidade_em_rodadas,
        usar_poda_alfa_beta=usar_poda_alfa_beta,
        movimento=melhor_movimento or movimentos_da_raiz[0],
        valor=valor,
        nos_visitados=contexto.nos_visitados,
        ramos_podados=contexto.ramos_podados,
        tempo_em_milissegundos=tempo_em_milissegundos,
        arvore=raiz,
    )


def obter_caminho_principal(raiz: NoDaArvore) -> list[NoDaArvore]:
    caminho = [raiz]
    no_atual = raiz
    while no_atual.indice_do_melhor_filho >= 0:
        no_atual = no_atual.filhos[no_atual.indice_do_melhor_filho]
        caminho.append(no_atual)
    return caminho


def valor_indica_vitoria(valor: float) -> bool:
    return valor >= VALOR_DE_VITORIA


def valor_indica_derrota(valor: float) -> bool:
    return valor <= -VALOR_DE_VITORIA
