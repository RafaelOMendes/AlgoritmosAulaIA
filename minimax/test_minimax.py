import unittest
from dataclasses import replace

from busca_minimax import calcular_valor_do_estado, escolher_preco_da_empresa
from mercado import (
    ConfiguracaoDoMercado,
    anunciar_preco_da_empresa,
    calcular_resultado_da_rodada,
    criar_estado_inicial,
    precos_que_o_concorrente_consegue_bancar,
)
from perfis_concorrente import PERFIS_DE_CONCORRENTE
from simulacao import simular_guerra_de_precos

MARGEM_DE_ERRO_NUMERICO = 1e-6
SEMENTES_TESTADAS = (1, 7, 42, 2024)


def criar_configuracoes_de_teste() -> list[ConfiguracaoDoMercado]:
    configuracao_padrao = ConfiguracaoDoMercado()
    return [
        replace(configuracao_padrao, quantidade_de_rodadas=rodadas, caixa_inicial_do_concorrente=caixa)
        for rodadas in (1, 2, 3)
        for caixa in (0.0, 1000.0, 2000.0, 5000.0)
    ]


class TestesDoModeloDeMercado(unittest.TestCase):
    def test_preco_menor_que_o_do_concorrente_aumenta_a_participacao(self):
        configuracao = ConfiguracaoDoMercado()
        resultado_mais_barato = calcular_resultado_da_rodada(configuracao, 0.5, 12, 16)
        resultado_mais_caro = calcular_resultado_da_rodada(configuracao, 0.5, 16, 12)
        self.assertGreater(resultado_mais_barato.participacao_da_empresa, 0.5)
        self.assertLess(resultado_mais_caro.participacao_da_empresa, 0.5)

    def test_participacao_fica_sempre_entre_zero_e_um(self):
        configuracao = ConfiguracaoDoMercado(sensibilidade_a_diferenca_de_preco=1.0)
        self.assertEqual(calcular_resultado_da_rodada(configuracao, 0.5, 8, 24).participacao_da_empresa, 1.0)
        self.assertEqual(calcular_resultado_da_rodada(configuracao, 0.5, 24, 8).participacao_da_empresa, 0.0)

    def test_concorrente_sem_caixa_nao_pode_vender_abaixo_do_custo(self):
        configuracao = ConfiguracaoDoMercado(caixa_inicial_do_concorrente=0.0)
        estado = anunciar_preco_da_empresa(criar_estado_inicial(configuracao), 12)
        precos_bancaveis = precos_que_o_concorrente_consegue_bancar(configuracao, estado)
        self.assertNotIn(8, precos_bancaveis)
        self.assertTrue(all(preco >= configuracao.custo_unitario_do_concorrente for preco in precos_bancaveis))

    def test_configuracao_sem_preco_viavel_para_o_concorrente_e_rejeitada(self):
        with self.assertRaises(ValueError):
            ConfiguracaoDoMercado(precos_possiveis=(5, 8), custo_unitario_do_concorrente=10.0)


class TestesDoMinimax(unittest.TestCase):
    def test_minimax_de_uma_rodada_coincide_com_a_forca_bruta(self):
        configuracao = ConfiguracaoDoMercado(quantidade_de_rodadas=1)
        estado_inicial = criar_estado_inicial(configuracao)

        melhor_pior_caso = max(
            min(
                calcular_resultado_da_rodada(
                    configuracao, estado_inicial.fidelidade_da_empresa, preco_da_empresa, preco_do_concorrente
                ).lucro_da_empresa
                for preco_do_concorrente in precos_que_o_concorrente_consegue_bancar(
                    configuracao, anunciar_preco_da_empresa(estado_inicial, preco_da_empresa)
                )
            )
            for preco_da_empresa in configuracao.precos_possiveis
        )

        valor_do_minimax, _ = calcular_valor_do_estado(configuracao, estado_inicial, usar_poda_alfa_beta=False)
        self.assertAlmostEqual(valor_do_minimax, melhor_pior_caso)

    def test_poda_alfa_beta_encontra_o_mesmo_valor_que_o_minimax_puro(self):
        for configuracao in criar_configuracoes_de_teste():
            with self.subTest(configuracao=configuracao):
                estado_inicial = criar_estado_inicial(configuracao)
                valor_sem_poda, _ = calcular_valor_do_estado(configuracao, estado_inicial, usar_poda_alfa_beta=False)
                valor_com_poda, _ = calcular_valor_do_estado(configuracao, estado_inicial, usar_poda_alfa_beta=True)
                self.assertAlmostEqual(valor_sem_poda, valor_com_poda)

    def test_poda_alfa_beta_visita_menos_nos(self):
        configuracao = ConfiguracaoDoMercado(quantidade_de_rodadas=3)
        estado_inicial = criar_estado_inicial(configuracao)
        _, estatisticas_sem_poda = calcular_valor_do_estado(configuracao, estado_inicial, usar_poda_alfa_beta=False)
        _, estatisticas_com_poda = calcular_valor_do_estado(configuracao, estado_inicial, usar_poda_alfa_beta=True)
        self.assertLess(estatisticas_com_poda.nos_visitados, estatisticas_sem_poda.nos_visitados)
        self.assertGreater(estatisticas_com_poda.podas_realizadas, 0)

    def test_preco_escolhido_tem_o_maior_lucro_garantido(self):
        configuracao = ConfiguracaoDoMercado()
        estado_inicial = criar_estado_inicial(configuracao)
        escolha = escolher_preco_da_empresa(configuracao, estado_inicial)
        valor_da_raiz, _ = calcular_valor_do_estado(configuracao, estado_inicial)
        self.assertAlmostEqual(escolha.lucro_minimo_garantido, valor_da_raiz)


class TestesDaSimulacao(unittest.TestCase):
    def test_empresa_nunca_lucra_menos_que_a_garantia(self):
        for configuracao in criar_configuracoes_de_teste():
            for nome_do_perfil, perfil in PERFIS_DE_CONCORRENTE.items():
                for semente in SEMENTES_TESTADAS:
                    with self.subTest(configuracao=configuracao, perfil=nome_do_perfil, semente=semente):
                        simulacao = simular_guerra_de_precos(configuracao, nome_do_perfil, perfil, semente)
                        self.assertGreaterEqual(
                            simulacao.lucro_total_da_empresa + MARGEM_DE_ERRO_NUMERICO,
                            simulacao.lucro_minimo_garantido_no_inicio,
                        )

    def test_contra_o_concorrente_agressivo_o_lucro_e_exatamente_a_garantia(self):
        for configuracao in criar_configuracoes_de_teste():
            with self.subTest(configuracao=configuracao):
                perfil_agressivo = PERFIS_DE_CONCORRENTE["Agressivo (minimax)"]
                simulacao = simular_guerra_de_precos(configuracao, "Agressivo (minimax)", perfil_agressivo, 0)
                self.assertAlmostEqual(
                    simulacao.lucro_total_da_empresa, simulacao.lucro_minimo_garantido_no_inicio
                )

    def test_concorrente_nunca_termina_rodada_com_caixa_negativo(self):
        for configuracao in criar_configuracoes_de_teste():
            for nome_do_perfil, perfil in PERFIS_DE_CONCORRENTE.items():
                with self.subTest(configuracao=configuracao, perfil=nome_do_perfil):
                    simulacao = simular_guerra_de_precos(configuracao, nome_do_perfil, perfil, 42)
                    for registro in simulacao.rodadas:
                        self.assertGreaterEqual(registro.caixa_do_concorrente_apos_a_rodada, 0)


if __name__ == "__main__":
    unittest.main()
