import json
import random
import unittest
from dataclasses import replace

from logica.api import ROTAS_DA_API
from logica.cidades import CIDADES_DO_BRASIL, Ponto, listar_capitais, sortear_cidades
from logica.distancias import calcular_distancia_em_km, comprimento_da_rota, criar_matriz_de_distancias
from logica.genetico import (
    ConfiguracaoDoAlgoritmo,
    Individuo,
    algoritmo_convergiu,
    criar_algoritmo_genetico,
    cruzar_com_order_crossover,
    evoluir_uma_geracao,
    mutar_por_inversao,
    selecionar_por_torneio,
)


def eh_permutacao_valida(rota, quantidade):
    return len(rota) == quantidade and set(rota) == set(range(quantidade))


class TestesDasDistancias(unittest.TestCase):
    def test_distancia_real_entre_sao_paulo_e_rio_de_janeiro(self):
        sao_paulo = Ponto("São Paulo", "SP", -23.5505, -46.6333)
        rio_de_janeiro = Ponto("Rio de Janeiro", "RJ", -22.9068, -43.1729)
        self.assertTrue(350 < calcular_distancia_em_km(sao_paulo, rio_de_janeiro) < 365)

    def test_mede_a_rota_fechada_incluindo_a_volta_ao_inicio(self):
        pontos = [Ponto("A", "", 0, 0), Ponto("B", "", 0, 1), Ponto("C", "", 1, 1), Ponto("D", "", 1, 0)]
        matriz = criar_matriz_de_distancias(pontos)
        quadrado = comprimento_da_rota((0, 1, 2, 3), matriz)
        cruzada = comprimento_da_rota((0, 2, 1, 3), matriz)
        self.assertLess(quadrado, cruzada)
        self.assertAlmostEqual(quadrado, 4 * calcular_distancia_em_km(pontos[0], pontos[1]), delta=1)


class TestesDasCidades(unittest.TestCase):
    def test_tem_as_27_capitais_e_sorteia_sem_repetir(self):
        self.assertEqual(len(listar_capitais()), 27)
        sorteadas = sortear_cidades(30, random.Random(5))
        self.assertEqual(len({cidade.nome for cidade in sorteadas}), 30)
        self.assertTrue(all(cidade in CIDADES_DO_BRASIL for cidade in sorteadas))


class TestesDosOperadoresGeneticos(unittest.TestCase):
    def test_cruzamento_ox_gera_rota_valida_e_preserva_o_trecho_do_pai_a(self):
        gerador_aleatorio = random.Random(7)
        pai_a = (0, 1, 2, 3, 4, 5, 6, 7, 8, 9)
        pai_b = (9, 3, 7, 1, 8, 0, 2, 6, 4, 5)
        for _ in range(200):
            resultado = cruzar_com_order_crossover(pai_a, pai_b, gerador_aleatorio)
            self.assertTrue(eh_permutacao_valida(resultado.rota, 10))
            trecho = slice(resultado.inicio_do_trecho, resultado.fim_do_trecho + 1)
            self.assertEqual(resultado.rota[trecho], pai_a[trecho])

    def test_exemplo_do_texto_explicativo(self):
        valores_sorteados = iter([2, 4])

        class GeradorDeExemplo(random.Random):
            def randint(self, inicio, fim):
                return next(valores_sorteados)

        resultado = cruzar_com_order_crossover(
            (0, 1, 2, 3, 4, 5, 6, 7), (7, 3, 0, 6, 2, 5, 1, 4), GeradorDeExemplo()
        )
        self.assertEqual(resultado.rota, (0, 6, 2, 3, 4, 5, 1, 7))

    def test_mutacao_por_inversao_inverte_so_o_trecho_sorteado(self):
        gerador_aleatorio = random.Random(3)
        rota_original = (0, 1, 2, 3, 4, 5, 6, 7)
        for _ in range(100):
            resultado = mutar_por_inversao(rota_original, gerador_aleatorio)
            self.assertTrue(eh_permutacao_valida(resultado.rota, 8))
            trecho = slice(resultado.inicio_do_trecho, resultado.fim_do_trecho + 1)
            self.assertEqual(resultado.rota[trecho], rota_original[trecho][::-1])

    def test_torneio_escolhe_o_participante_com_a_menor_distancia(self):
        populacao = [Individuo((0,), 50.0), Individuo((1,), 10.0), Individuo((2,), 30.0)]
        resultado = selecionar_por_torneio(populacao, 5, random.Random(1))
        self.assertEqual(resultado.vencedor.distancia, min(p.distancia for p in resultado.participantes))


class TestesDoAlgoritmoGenetico(unittest.TestCase):
    def test_elitismo_nunca_piora_a_melhor_rota_e_ela_melhora_bastante(self):
        configuracao = ConfiguracaoDoAlgoritmo()
        algoritmo = criar_algoritmo_genetico(listar_capitais(), configuracao, 11)
        melhor_inicial = algoritmo.populacao[0].distancia
        melhor_anterior = melhor_inicial
        for _ in range(300):
            evoluir_uma_geracao(algoritmo, configuracao)
            self.assertLessEqual(algoritmo.populacao[0].distancia, melhor_anterior + 1e-9)
            melhor_anterior = algoritmo.populacao[0].distancia
            self.assertTrue(eh_permutacao_valida(algoritmo.populacao[0].rota, 27))
        self.assertLess(melhor_anterior, melhor_inicial * 0.5)

    def test_mantem_o_tamanho_da_populacao_e_registra_o_historico(self):
        configuracao = replace(ConfiguracaoDoAlgoritmo(), tamanho_da_populacao=40)
        algoritmo = criar_algoritmo_genetico(listar_capitais(), configuracao, 2)
        for _ in range(10):
            evoluir_uma_geracao(algoritmo, configuracao)
            self.assertEqual(len(algoritmo.populacao), 40)
        self.assertEqual(len(algoritmo.historico), 11)
        for estatisticas in algoritmo.historico:
            self.assertLessEqual(estatisticas.melhor, estatisticas.media)
            self.assertLessEqual(estatisticas.media, estatisticas.pior)

    def test_para_quando_passa_muitas_geracoes_sem_melhorar(self):
        configuracao = replace(ConfiguracaoDoAlgoritmo(), geracoes_sem_melhora_para_parar=50)
        algoritmo = criar_algoritmo_genetico(sortear_cidades(8, random.Random(4)), configuracao, 4)
        while not algoritmo_convergiu(algoritmo, configuracao) and algoritmo.geracao < 5000:
            evoluir_uma_geracao(algoritmo, configuracao)
        self.assertTrue(algoritmo_convergiu(algoritmo, configuracao))

    def test_exige_pelo_menos_4_pontos(self):
        with self.assertRaises(ValueError):
            criar_algoritmo_genetico(listar_capitais()[:3], ConfiguracaoDoAlgoritmo(), 1)


class TestesDaApi(unittest.TestCase):
    def test_fluxo_completo_da_api_gera_json_valido(self):
        capitais = ROTAS_DA_API["/api/capitais"]({})
        inicio = ROTAS_DA_API["/api/iniciar"]({"pontos": capitais["pontos"], "semente": 3})
        evolucao = ROTAS_DA_API["/api/evoluir"]({"id": inicio["id"], "geracoes": 20, "desdeAGeracao": 0})
        for resposta in (capitais, inicio, evolucao):
            json.dumps(resposta, allow_nan=False)
        self.assertEqual(len(capitais["pontos"]), 27)
        self.assertEqual(evolucao["geracao"], 20)
        self.assertEqual([registro["geracao"] for registro in evolucao["historicoNovo"]], list(range(1, 21)))
        self.assertEqual(len(evolucao["melhor"]["trechos"]), 27)
        self.assertAlmostEqual(sum(evolucao["melhor"]["trechos"]), evolucao["melhor"]["distancia"])

    def test_recusa_execucao_inexistente_e_poucos_pontos(self):
        with self.assertRaises(ValueError):
            ROTAS_DA_API["/api/evoluir"]({"id": "nao-existe"})
        with self.assertRaises(ValueError):
            ROTAS_DA_API["/api/iniciar"]({"pontos": ROTAS_DA_API["/api/capitais"]({})["pontos"][:3]})


if __name__ == "__main__":
    unittest.main()
