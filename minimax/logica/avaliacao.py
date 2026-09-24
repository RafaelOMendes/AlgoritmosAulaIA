from collections import deque
from dataclasses import dataclass

from .jogo import Estado, oponente_de
from .tabuleiro import CELULA_LIVRE, tabela_de_vizinhos_dentro_do_tabuleiro

CELULA_SEM_DONO = 0
CELULA_DO_AZUL = 1
CELULA_DO_LARANJA = 2
CELULA_DISPUTADA = 3

DISTANCIA_INALCANCAVEL = -1


@dataclass(frozen=True)
class Territorios:
    azul: int
    laranja: int
    disputadas: int
    dono_de_cada_celula: bytes


@dataclass(frozen=True)
class AvaliacaoDaPosicao:
    valor: int
    territorio_do_maximizador: int
    territorio_do_minimizador: int


def calcular_distancias_a_partir_de(estado: Estado, origem: int) -> list[int]:
    vizinhos = tabela_de_vizinhos_dentro_do_tabuleiro(estado.tamanho)
    celulas = estado.celulas
    distancias = [DISTANCIA_INALCANCAVEL] * len(celulas)
    distancias[origem] = 0
    fila = deque([origem])
    while fila:
        celula_atual = fila.popleft()
        proxima_distancia = distancias[celula_atual] + 1
        for vizinho in vizinhos[celula_atual]:
            if distancias[vizinho] == DISTANCIA_INALCANCAVEL and celulas[vizinho] == CELULA_LIVRE:
                distancias[vizinho] = proxima_distancia
                fila.append(vizinho)
    return distancias


def calcular_territorios(estado: Estado) -> Territorios:
    vizinhos = tabela_de_vizinhos_dentro_do_tabuleiro(estado.tamanho)
    celulas = estado.celulas
    dono_de_cada_celula = bytearray(len(celulas))
    camada_em_que_foi_alcancada = [DISTANCIA_INALCANCAVEL] * len(celulas)
    fronteira_do_azul = [estado.posicoes["azul"]]
    fronteira_do_laranja = [estado.posicoes["laranja"]]
    camada_atual = 0

    while fronteira_do_azul or fronteira_do_laranja:
        camada_atual += 1
        nova_fronteira_do_azul = []
        for celula in fronteira_do_azul:
            for vizinho in vizinhos[celula]:
                if celulas[vizinho] == CELULA_LIVRE and dono_de_cada_celula[vizinho] == CELULA_SEM_DONO:
                    dono_de_cada_celula[vizinho] = CELULA_DO_AZUL
                    camada_em_que_foi_alcancada[vizinho] = camada_atual
                    nova_fronteira_do_azul.append(vizinho)

        nova_fronteira_do_laranja = []
        for celula in fronteira_do_laranja:
            for vizinho in vizinhos[celula]:
                if celulas[vizinho] != CELULA_LIVRE:
                    continue
                dono_atual = dono_de_cada_celula[vizinho]
                if dono_atual == CELULA_SEM_DONO:
                    dono_de_cada_celula[vizinho] = CELULA_DO_LARANJA
                    camada_em_que_foi_alcancada[vizinho] = camada_atual
                    nova_fronteira_do_laranja.append(vizinho)
                elif dono_atual == CELULA_DO_AZUL and camada_em_que_foi_alcancada[vizinho] == camada_atual:
                    dono_de_cada_celula[vizinho] = CELULA_DISPUTADA
                    nova_fronteira_do_laranja.append(vizinho)

        fronteira_do_azul = nova_fronteira_do_azul
        fronteira_do_laranja = nova_fronteira_do_laranja

    return Territorios(
        azul=dono_de_cada_celula.count(CELULA_DO_AZUL),
        laranja=dono_de_cada_celula.count(CELULA_DO_LARANJA),
        disputadas=dono_de_cada_celula.count(CELULA_DISPUTADA),
        dono_de_cada_celula=bytes(dono_de_cada_celula),
    )


def avaliar_posicao(estado: Estado, jogador_maximizador: str) -> AvaliacaoDaPosicao:
    territorios = calcular_territorios(estado)
    territorio_do_maximizador = getattr(territorios, jogador_maximizador)
    territorio_do_minimizador = getattr(territorios, oponente_de(jogador_maximizador))
    return AvaliacaoDaPosicao(
        valor=territorio_do_maximizador - territorio_do_minimizador,
        territorio_do_maximizador=territorio_do_maximizador,
        territorio_do_minimizador=territorio_do_minimizador,
    )


def contar_espaco_alcancavel(estado: Estado, origem: int) -> int:
    distancias = calcular_distancias_a_partir_de(estado, origem)
    return sum(1 for distancia in distancias if distancia > 0)
