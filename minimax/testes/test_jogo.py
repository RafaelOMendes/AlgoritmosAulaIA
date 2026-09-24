import copy
import random
import unittest

from logica.avaliacao import (
    CELULA_DISPUTADA,
    CELULA_DO_AZUL,
    CELULA_DO_LARANJA,
    CELULA_SEM_DONO,
    DISTANCIA_INALCANCAVEL,
    avaliar_posicao,
    calcular_distancias_a_partir_de,
    calcular_territorios,
)
from logica.jogo import (
    aplicar_rodada,
    criar_estado_inicial,
    descrever_causa_da_colisao,
    desfazer_rodada_in_place,
    fazer_rodada_in_place,
    jogo_terminou,
    movimentos_possiveis,
    movimentos_seguros,
    vencedor_do_jogo,
)
from logica.labirinto import gerar_labirinto
from logica.tabuleiro import CELULA_LIVRE, ORDEM_DAS_DIRECOES
from testes.auxiliares import criar_estado_a_partir_do_mapa


def dono_pela_comparacao_de_distancias(estado):
    distancias_do_azul = calcular_distancias_a_partir_de(estado, estado.posicoes["azul"])
    distancias_do_laranja = calcular_distancias_a_partir_de(estado, estado.posicoes["laranja"])
    donos = bytearray(len(estado.celulas))
    for indice, celula in enumerate(estado.celulas):
        if celula != CELULA_LIVRE:
            continue
        distancia_do_azul = distancias_do_azul[indice]
        distancia_do_laranja = distancias_do_laranja[indice]
        azul_alcanca = distancia_do_azul != DISTANCIA_INALCANCAVEL
        laranja_alcanca = distancia_do_laranja != DISTANCIA_INALCANCAVEL
        if not azul_alcanca and not laranja_alcanca:
            donos[indice] = CELULA_SEM_DONO
        elif azul_alcanca and (not laranja_alcanca or distancia_do_azul < distancia_do_laranja):
            donos[indice] = CELULA_DO_AZUL
        elif laranja_alcanca and (not azul_alcanca or distancia_do_laranja < distancia_do_azul):
            donos[indice] = CELULA_DO_LARANJA
        else:
            donos[indice] = CELULA_DISPUTADA
    return bytes(donos)


class TestesDasRegrasDoJogo(unittest.TestCase):
    def test_so_considera_seguros_os_movimentos_para_celulas_livres(self):
        estado = criar_estado_a_partir_do_mapa(["A.#..", "a....", ".....", ".....", "....L"])
        self.assertEqual(movimentos_seguros(estado, "azul"), ["direita"])
        self.assertEqual(movimentos_seguros(estado, "laranja"), ["cima", "esquerda"])

    def test_colisao_frontal_elimina_os_dois_e_declara_empate(self):
        estado = criar_estado_a_partir_do_mapa(["#####", "#A.L#", "#####", "#####", "#####"])
        depois = aplicar_rodada(estado, "direita", "esquerda")
        self.assertEqual(vencedor_do_jogo(depois), "empate")
        self.assertEqual(descrever_causa_da_colisao(estado, depois, "azul"), "colisão frontal com o oponente")

    def test_identifica_a_causa_de_cada_batida(self):
        estado = criar_estado_a_partir_do_mapa(["A#...", ".....", ".....", "l....", "L...."])
        bateu_na_parede = aplicar_rodada(estado, "direita", "direita")
        self.assertEqual(vencedor_do_jogo(bateu_na_parede), "laranja")
        self.assertEqual(descrever_causa_da_colisao(estado, bateu_na_parede, "azul"), "bateu em uma parede")
        saiu_do_tabuleiro = aplicar_rodada(estado, "cima", "direita")
        self.assertEqual(descrever_causa_da_colisao(estado, saiu_do_tabuleiro, "azul"), "saiu do tabuleiro")
        bateu_no_proprio_rastro = aplicar_rodada(estado, "baixo", "cima")
        self.assertEqual(
            descrever_causa_da_colisao(estado, bateu_no_proprio_rastro, "laranja"), "bateu no próprio rastro"
        )

    def test_nao_altera_o_estado_anterior_ao_aplicar_uma_rodada(self):
        estado = criar_estado_a_partir_do_mapa(["A....", ".....", ".....", ".....", "....L"])
        celulas_antes = bytes(estado.celulas)
        depois = aplicar_rodada(estado, "direita", "esquerda")
        self.assertEqual(bytes(estado.celulas), celulas_antes)
        self.assertNotEqual(depois.posicoes["azul"], estado.posicoes["azul"])
        self.assertEqual(depois.rodada, 1)

    def test_guarda_a_trilha_de_cada_jogador_na_ordem(self):
        estado = criar_estado_a_partir_do_mapa(["A....", ".....", ".....", ".....", "....L"])
        estado = aplicar_rodada(estado, "direita", "cima")
        estado = aplicar_rodada(estado, "baixo", "cima")
        self.assertEqual(estado.trilhas["azul"], [0, 1, 6])
        self.assertEqual(estado.trilhas["laranja"], [24, 19, 14])

    def test_fazer_e_desfazer_no_proprio_estado_equivale_a_aplicar_a_rodada_numa_copia(self):
        gerador_aleatorio = random.Random(2)
        for semente in range(8):
            estado = criar_estado_inicial(gerar_labirinto(11, semente))
            while not jogo_terminou(estado):
                estado_original = copy.deepcopy(estado)
                for movimento_do_azul in ORDEM_DAS_DIRECOES:
                    for movimento_do_laranja in ORDEM_DAS_DIRECOES:
                        estado_esperado = aplicar_rodada(estado, movimento_do_azul, movimento_do_laranja)
                        reversao = fazer_rodada_in_place(estado, movimento_do_azul, movimento_do_laranja)
                        self.assertEqual(estado, estado_esperado)
                        desfazer_rodada_in_place(estado, reversao)
                        self.assertEqual(estado, estado_original)
                estado = aplicar_rodada(
                    estado,
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "azul")),
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "laranja")),
                )


class TestesDaFuncaoDeAvaliacao(unittest.TestCase):
    def test_da_cada_celula_a_quem_chega_primeiro(self):
        estado = criar_estado_a_partir_do_mapa(["A...L", "#####", "#####", "#####", "#####"])
        territorios = calcular_territorios(estado)
        self.assertEqual((territorios.azul, territorios.laranja, territorios.disputadas), (1, 1, 1))

    def test_conta_o_espaco_isolado_e_muda_de_sinal_conforme_o_ponto_de_vista(self):
        estado = criar_estado_a_partir_do_mapa(["A..#L", "...#.", "...#.", "#####", "#####"])
        self.assertEqual(avaliar_posicao(estado, "azul").valor, 8 - 2)
        self.assertEqual(avaliar_posicao(estado, "laranja").valor, 2 - 8)

    def test_busca_simultanea_equivale_a_comparar_as_distancias_de_cada_jogador(self):
        gerador_aleatorio = random.Random(1)
        for semente in range(15):
            estado = criar_estado_inicial(gerar_labirinto(13, semente))
            while not jogo_terminou(estado):
                self.assertEqual(
                    calcular_territorios(estado).dono_de_cada_celula, dono_pela_comparacao_de_distancias(estado)
                )
                estado = aplicar_rodada(
                    estado,
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "azul")),
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "laranja")),
                )


if __name__ == "__main__":
    unittest.main()
