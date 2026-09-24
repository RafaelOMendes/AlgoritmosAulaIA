from logica.jogo import Estado
from logica.tabuleiro import (
    CELULA_LIVRE,
    CELULA_PAREDE,
    CELULA_RASTRO_AZUL,
    CELULA_RASTRO_LARANJA,
    indice_da_celula,
)

CELULA_POR_SIMBOLO = {
    ".": CELULA_LIVRE,
    "#": CELULA_PAREDE,
    "A": CELULA_RASTRO_AZUL,
    "a": CELULA_RASTRO_AZUL,
    "L": CELULA_RASTRO_LARANJA,
    "l": CELULA_RASTRO_LARANJA,
}


def criar_estado_a_partir_do_mapa(linhas_do_mapa: list[str]) -> Estado:
    tamanho = len(linhas_do_mapa)
    celulas = bytearray(tamanho * tamanho)
    posicoes = {}
    for linha, texto_da_linha in enumerate(linhas_do_mapa):
        if len(texto_da_linha) != tamanho:
            raise ValueError("O mapa de teste precisa ser quadrado.")
        for coluna, simbolo in enumerate(texto_da_linha):
            indice = indice_da_celula(tamanho, linha, coluna)
            celulas[indice] = CELULA_POR_SIMBOLO[simbolo]
            if simbolo == "A":
                posicoes["azul"] = indice
            if simbolo == "L":
                posicoes["laranja"] = indice
    return Estado(
        tamanho=tamanho,
        celulas=celulas,
        posicoes=posicoes,
        trilhas={jogador: [posicao] for jogador, posicao in posicoes.items()},
        vivos={"azul": True, "laranja": True},
        rodada=0,
        ultimos_movimentos={"azul": None, "laranja": None},
        pontos_de_colisao={"azul": None, "laranja": None},
    )
