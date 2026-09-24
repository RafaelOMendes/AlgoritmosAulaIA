import math

from .cidades import Ponto

RAIO_DA_TERRA_EM_KM = 6371.0


def calcular_distancia_em_km(ponto_a: Ponto, ponto_b: Ponto) -> float:
    latitude_a = math.radians(ponto_a.latitude)
    latitude_b = math.radians(ponto_b.latitude)
    diferenca_de_latitude = latitude_b - latitude_a
    diferenca_de_longitude = math.radians(ponto_b.longitude - ponto_a.longitude)
    termo_de_haversine = (
        math.sin(diferenca_de_latitude / 2) ** 2
        + math.cos(latitude_a) * math.cos(latitude_b) * math.sin(diferenca_de_longitude / 2) ** 2
    )
    return 2 * RAIO_DA_TERRA_EM_KM * math.asin(math.sqrt(termo_de_haversine))


def criar_matriz_de_distancias(pontos: list[Ponto]) -> list[list[float]]:
    return [[calcular_distancia_em_km(origem, destino) for destino in pontos] for origem in pontos]


def comprimento_da_rota(rota: tuple[int, ...], matriz_de_distancias: list[list[float]]) -> float:
    return sum(matriz_de_distancias[rota[posicao - 1]][rota[posicao]] for posicao in range(len(rota)))


def distancias_dos_trechos(rota: tuple[int, ...], matriz_de_distancias: list[list[float]]) -> list[float]:
    return [
        matriz_de_distancias[rota[posicao]][rota[(posicao + 1) % len(rota)]] for posicao in range(len(rota))
    ]
