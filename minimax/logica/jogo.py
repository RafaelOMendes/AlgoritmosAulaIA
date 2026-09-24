from dataclasses import dataclass

from .labirinto import Labirinto
from .tabuleiro import (
    CELULA_LIVRE,
    CELULA_PAREDE,
    CELULA_RASTRO_AZUL,
    CELULA_RASTRO_LARANJA,
    FORA_DO_TABULEIRO,
    ORDEM_DAS_DIRECOES,
    tabela_de_vizinhos_por_direcao,
)

JOGADORES = ("azul", "laranja")
NOME_DE_EXIBICAO = {"azul": "Azul", "laranja": "Laranja"}
CELULA_DE_RASTRO_DO_JOGADOR = {"azul": CELULA_RASTRO_AZUL, "laranja": CELULA_RASTRO_LARANJA}


@dataclass(slots=True)
class Estado:
    tamanho: int
    celulas: bytearray
    posicoes: dict[str, int]
    trilhas: dict[str, list[int]]
    vivos: dict[str, bool]
    rodada: int
    ultimos_movimentos: dict[str, str | None]
    pontos_de_colisao: dict[str, int | None]


def oponente_de(jogador: str) -> str:
    return "laranja" if jogador == "azul" else "azul"


def criar_estado_inicial(labirinto: Labirinto) -> Estado:
    celulas = bytearray(labirinto.celulas)
    celulas[labirinto.posicoes_iniciais["azul"]] = CELULA_RASTRO_AZUL
    celulas[labirinto.posicoes_iniciais["laranja"]] = CELULA_RASTRO_LARANJA
    return Estado(
        tamanho=labirinto.tamanho,
        celulas=celulas,
        posicoes=dict(labirinto.posicoes_iniciais),
        trilhas={jogador: [posicao] for jogador, posicao in labirinto.posicoes_iniciais.items()},
        vivos={"azul": True, "laranja": True},
        rodada=0,
        ultimos_movimentos={"azul": None, "laranja": None},
        pontos_de_colisao={"azul": None, "laranja": None},
    )


def celula_esta_livre(estado: Estado, indice: int) -> bool:
    return indice != FORA_DO_TABULEIRO and estado.celulas[indice] == CELULA_LIVRE


def movimentos_seguros(estado: Estado, jogador: str) -> list[str]:
    vizinhos = tabela_de_vizinhos_por_direcao(estado.tamanho)[estado.posicoes[jogador]]
    return [direcao for direcao in ORDEM_DAS_DIRECOES if celula_esta_livre(estado, vizinhos[direcao])]


def movimentos_possiveis(estado: Estado, jogador: str) -> list[str]:
    seguros = movimentos_seguros(estado, jogador)
    if seguros:
        return seguros
    return [estado.ultimos_movimentos[jogador] or ORDEM_DAS_DIRECOES[0]]


def jogo_terminou(estado: Estado) -> bool:
    return not estado.vivos["azul"] or not estado.vivos["laranja"]


def vencedor_do_jogo(estado: Estado) -> str | None:
    if not jogo_terminou(estado):
        return None
    if estado.vivos["azul"]:
        return "azul"
    if estado.vivos["laranja"]:
        return "laranja"
    return "empate"


def aplicar_rodada(estado: Estado, movimento_do_azul: str, movimento_do_laranja: str) -> Estado:
    vizinhos = tabela_de_vizinhos_por_direcao(estado.tamanho)
    destino_do_azul = vizinhos[estado.posicoes["azul"]][movimento_do_azul]
    destino_do_laranja = vizinhos[estado.posicoes["laranja"]][movimento_do_laranja]
    houve_colisao_frontal = destino_do_azul == destino_do_laranja

    azul_sobrevive = celula_esta_livre(estado, destino_do_azul) and not houve_colisao_frontal
    laranja_sobrevive = celula_esta_livre(estado, destino_do_laranja) and not houve_colisao_frontal

    celulas = bytearray(estado.celulas)
    if azul_sobrevive:
        celulas[destino_do_azul] = CELULA_RASTRO_AZUL
    if laranja_sobrevive:
        celulas[destino_do_laranja] = CELULA_RASTRO_LARANJA

    return Estado(
        tamanho=estado.tamanho,
        celulas=celulas,
        posicoes={
            "azul": destino_do_azul if azul_sobrevive else estado.posicoes["azul"],
            "laranja": destino_do_laranja if laranja_sobrevive else estado.posicoes["laranja"],
        },
        trilhas={
            "azul": estado.trilhas["azul"] + [destino_do_azul] if azul_sobrevive else estado.trilhas["azul"],
            "laranja": estado.trilhas["laranja"] + [destino_do_laranja] if laranja_sobrevive else estado.trilhas["laranja"],
        },
        vivos={"azul": azul_sobrevive, "laranja": laranja_sobrevive},
        rodada=estado.rodada + 1,
        ultimos_movimentos={"azul": movimento_do_azul, "laranja": movimento_do_laranja},
        pontos_de_colisao={
            "azul": None if azul_sobrevive else destino_do_azul,
            "laranja": None if laranja_sobrevive else destino_do_laranja,
        },
    )


def aplicar_rodada_por_papel(
    estado: Estado, jogador_maximizador: str, movimento_do_maximizador: str, movimento_do_minimizador: str
) -> Estado:
    if jogador_maximizador == "azul":
        return aplicar_rodada(estado, movimento_do_maximizador, movimento_do_minimizador)
    return aplicar_rodada(estado, movimento_do_minimizador, movimento_do_maximizador)


def descrever_causa_da_colisao(estado_antes: Estado, estado_depois: Estado, jogador: str) -> str | None:
    if estado_depois.vivos[jogador]:
        return None
    ponto_de_colisao = estado_depois.pontos_de_colisao[jogador]
    ponto_de_colisao_do_oponente = estado_depois.pontos_de_colisao[oponente_de(jogador)]
    if ponto_de_colisao == FORA_DO_TABULEIRO:
        return "saiu do tabuleiro"
    if ponto_de_colisao == ponto_de_colisao_do_oponente and estado_antes.celulas[ponto_de_colisao] == CELULA_LIVRE:
        return "colisão frontal com o oponente"
    celula_atingida = estado_antes.celulas[ponto_de_colisao]
    if celula_atingida == CELULA_PAREDE:
        return "bateu em uma parede"
    if celula_atingida == CELULA_DE_RASTRO_DO_JOGADOR[jogador]:
        return "bateu no próprio rastro"
    return "bateu no rastro do oponente"
