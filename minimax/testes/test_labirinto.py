import unittest

from logica.labirinto import encontrar_celulas_alcancaveis, gerar_labirinto
from logica.tabuleiro import CELULA_LIVRE, CELULA_PAREDE, indice_espelhado

TAMANHOS_TESTADOS = (9, 13, 17, 21)
SEMENTES_TESTADAS = (1, 2, 3, 42, 777, 123456)


class TestesDaGeracaoDoLabirinto(unittest.TestCase):
    def test_gera_sempre_o_mesmo_labirinto_para_a_mesma_semente(self):
        self.assertEqual(gerar_labirinto(17, 2024).celulas, gerar_labirinto(17, 2024).celulas)

    def test_gera_labirintos_diferentes_para_sementes_diferentes(self):
        labirintos = {gerar_labirinto(17, semente).celulas for semente in SEMENTES_TESTADAS}
        self.assertEqual(len(labirintos), len(SEMENTES_TESTADAS))

    def test_e_simetrico_em_rotacao_de_180_graus(self):
        for tamanho in TAMANHOS_TESTADOS:
            for semente in SEMENTES_TESTADAS:
                labirinto = gerar_labirinto(tamanho, semente)
                for indice, celula in enumerate(labirinto.celulas):
                    self.assertEqual(celula, labirinto.celulas[indice_espelhado(tamanho, indice)])
                self.assertEqual(
                    labirinto.posicoes_iniciais["laranja"],
                    indice_espelhado(tamanho, labirinto.posicoes_iniciais["azul"]),
                )

    def test_deixa_todas_as_celulas_livres_conectadas(self):
        for tamanho in TAMANHOS_TESTADOS:
            for semente in SEMENTES_TESTADAS:
                labirinto = gerar_labirinto(tamanho, semente)
                inicio_do_azul = labirinto.posicoes_iniciais["azul"]
                self.assertEqual(labirinto.celulas[inicio_do_azul], CELULA_LIVRE)
                self.assertEqual(labirinto.celulas[labirinto.posicoes_iniciais["laranja"]], CELULA_LIVRE)
                alcancaveis = encontrar_celulas_alcancaveis(tamanho, labirinto.celulas, inicio_do_azul)
                celulas_livres = {
                    indice for indice, celula in enumerate(labirinto.celulas) if celula == CELULA_LIVRE
                }
                self.assertEqual(celulas_livres, alcancaveis)

    def test_coloca_paredes_no_labirinto(self):
        labirinto = gerar_labirinto(17, 99)
        self.assertGreater(labirinto.celulas.count(CELULA_PAREDE), 17 * 17 * 0.1)

    def test_recusa_labirintos_pequenos_demais(self):
        with self.assertRaises(ValueError):
            gerar_labirinto(5, 1)


if __name__ == "__main__":
    unittest.main()
