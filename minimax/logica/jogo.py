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


@dataclass(slots=True)
class ReversaoDeRodada:
    posicao_azul: int
    posicao_laranja: int
    vivo_azul: bool
    vivo_laranja: bool
    ultimo_movimento_azul: str | None
    ultimo_movimento_laranja: str | None
    ponto_colisao_azul: int | None
    ponto_colisao_laranja: int | None
    celula_modificada_azul: int | None
    celula_modificada_laranja: int | None


def fazer_rodada_in_place(estado: Estado, movimento_do_azul: str, movimento_do_laranja: str) -> ReversaoDeRodada:
    reversao = ReversaoDeRodada(
        estado.posicoes["azul"], estado.posicoes["laranja"],
        estado.vivos["azul"], estado.vivos["laranja"],
        estado.ultimos_movimentos["azul"], estado.ultimos_movimentos["laranja"],
        estado.pontos_de_colisao["azul"], estado.pontos_de_colisao["laranja"],
        None, None
    )

    vizinhos = tabela_de_vizinhos_por_direcao(estado.tamanho)
    destino_do_azul = vizinhos[estado.posicoes["azul"]][movimento_do_azul]
    destino_do_laranja = vizinhos[estado.posicoes["laranja"]][movimento_do_laranja]
    houve_colisao_frontal = destino_do_azul == destino_do_laranja

    azul_sobrevive = celula_esta_livre(estado, destino_do_azul) and not houve_colisao_frontal
    laranja_sobrevive = celula_esta_livre(estado, destino_do_laranja) and not houve_colisao_frontal

    if azul_sobrevive:
        estado.celulas[destino_do_azul] = CELULA_RASTRO_AZUL
        estado.posicoes["azul"] = destino_do_azul
        estado.trilhas["azul"].append(destino_do_azul)
        reversao.celula_modificada_azul = destino_do_azul
    else:
        estado.vivos["azul"] = False
        estado.pontos_de_colisao["azul"] = destino_do_azul

    if laranja_sobrevive:
        estado.celulas[destino_do_laranja] = CELULA_RASTRO_LARANJA
        estado.posicoes["laranja"] = destino_do_laranja
        estado.trilhas["laranja"].append(destino_do_laranja)
        reversao.celula_modificada_laranja = destino_do_laranja
    else:
        estado.vivos["laranja"] = False
        estado.pontos_de_colisao["laranja"] = destino_do_laranja

    estado.ultimos_movimentos["azul"] = movimento_do_azul
    estado.ultimos_movimentos["laranja"] = movimento_do_laranja
    estado.rodada += 1

    return reversao


def desfazer_rodada_in_place(estado: Estado, reversao: ReversaoDeRodada) -> None:
    estado.rodada -= 1
    
    if reversao.celula_modificada_azul is not None:
        estado.celulas[reversao.celula_modificada_azul] = CELULA_LIVRE
        estado.trilhas["azul"].pop()
    if reversao.celula_modificada_laranja is not None:
        estado.celulas[reversao.celula_modificada_laranja] = CELULA_LIVRE
        estado.trilhas["laranja"].pop()

    estado.posicoes["azul"] = reversao.posicao_azul
    estado.posicoes["laranja"] = reversao.posicao_laranja
    estado.vivos["azul"] = reversao.vivo_azul
    estado.vivos["laranja"] = reversao.vivo_laranja
    estado.ultimos_movimentos["azul"] = reversao.ultimo_movimento_azul
    estado.ultimos_movimentos["laranja"] = reversao.ultimo_movimento_laranja
    estado.pontos_de_colisao["azul"] = reversao.ponto_colisao_azul
    estado.pontos_de_colisao["laranja"] = reversao.ponto_colisao_laranja


def fazer_rodada_por_papel_in_place(
    estado: Estado, jogador_maximizador: str, movimento_do_maximizador: str, movimento_do_minimizador: str
) -> ReversaoDeRodada:
    if jogador_maximizador == "azul":
        return fazer_rodada_in_place(estado, movimento_do_maximizador, movimento_do_minimizador)
    return fazer_rodada_in_place(estado, movimento_do_minimizador, movimento_do_maximizador)
