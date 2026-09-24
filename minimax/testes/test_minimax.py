import json
import random
import unittest
from unittest import mock

from logica.api import PROFUNDIDADE_MAXIMA_DA_ARVORE, ROTAS_DA_API, ErroDeRequisicao
from logica.estrategias import ConfiguracaoDoAgente, decidir_movimento
from logica.jogo import aplicar_rodada, criar_estado_inicial, jogo_terminou, movimentos_possiveis, vencedor_do_jogo
from logica.labirinto import gerar_labirinto
from logica.minimax import (
    PROFUNDIDADE_MINIMA_PARA_PARALELIZAR,
    VALOR_DE_EMPATE,
    VALOR_DE_VITORIA,
    VALOR_EXATO,
    buscar_melhor_movimento,
    deve_paralelizar_a_raiz,
    obter_caminho_principal,
    valor_indica_derrota,
    valor_indica_vitoria,
)
from logica.partida import simular_partida_completa
from testes.auxiliares import criar_estado_a_partir_do_mapa

MAPA_COM_BECO_SEM_SAIDA = [
    "#########",
    "##A.#####",
    "##.######",
    "##......#",
    "##......#",
    "##......#",
    "##......#",
    "##.....L#",
    "#########",
]

MAPA_COM_LARANJA_ENCURRALADO = [
    "#########",
    "#L.######",
    "#########",
    "#A......#",
    "#.......#",
    "#.......#",
    "#.......#",
    "#.......#",
    "#########",
]

MAPA_COM_COLISAO_FRONTAL_INEVITAVEL = ["#####", "#A.L#", "#####", "#####", "#####"]


def gerar_estados_de_meio_de_jogo():
    estados = []
    for semente in (3, 11, 29):
        gerador_aleatorio = random.Random(semente)
        estado = criar_estado_inicial(gerar_labirinto(13, semente))
        for _ in range(8):
            if jogo_terminou(estado):
                break
            estados.append(estado)
            estado = aplicar_rodada(
                estado,
                gerador_aleatorio.choice(movimentos_possiveis(estado, "azul")),
                gerador_aleatorio.choice(movimentos_possiveis(estado, "laranja")),
            )
    return estados


def contar_nos(no, filtro):
    return (1 if filtro(no) else 0) + sum(contar_nos(filho, filtro) for filho in no.filhos)


class TestesDoMinimax(unittest.TestCase):
    def test_evita_entrar_num_beco_sem_saida(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_BECO_SEM_SAIDA)
        for profundidade in (1, 2, 3):
            self.assertEqual(buscar_melhor_movimento(estado, "azul", profundidade).movimento, "baixo")

    def test_enxerga_a_derrota_do_beco_com_duas_rodadas(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_BECO_SEM_SAIDA)
        busca = buscar_melhor_movimento(estado, "azul", 2, registrar_arvore=True)
        ramo_do_beco = next(filho for filho in busca.arvore.filhos if filho.movimento == "direita")
        self.assertTrue(valor_indica_derrota(ramo_do_beco.valor))

    def test_so_reconhece_a_vitoria_quando_ela_esta_dentro_da_profundidade(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_LARANJA_ENCURRALADO)
        self.assertFalse(valor_indica_vitoria(buscar_melhor_movimento(estado, "azul", 1).valor))
        self.assertEqual(buscar_melhor_movimento(estado, "azul", 3).valor, VALOR_DE_VITORIA + 1)

    def test_da_valor_de_empate_quando_a_colisao_frontal_e_inevitavel(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_COLISAO_FRONTAL_INEVITAVEL)
        self.assertEqual(buscar_melhor_movimento(estado, "azul", 2).valor, VALOR_DE_EMPATE)

    def test_poda_alfa_beta_encontra_o_mesmo_valor_e_a_mesma_jogada_que_o_minimax_puro(self):
        nos_sem_poda = 0
        nos_com_poda = 0
        for estado in gerar_estados_de_meio_de_jogo():
            for jogador in ("azul", "laranja"):
                for profundidade in (1, 2, 3):
                    sem_poda = buscar_melhor_movimento(estado, jogador, profundidade, usar_poda_alfa_beta=False)
                    com_poda = buscar_melhor_movimento(estado, jogador, profundidade, usar_poda_alfa_beta=True)
                    self.assertEqual(com_poda.valor, sem_poda.valor)
                    self.assertEqual(com_poda.movimento, sem_poda.movimento)
                    self.assertEqual(sem_poda.ramos_podados, 0)
                    nos_sem_poda += sem_poda.nos_visitados
                    nos_com_poda += com_poda.nos_visitados
        self.assertLess(nos_com_poda, nos_sem_poda * 0.7)

    def test_registra_uma_arvore_coerente_com_as_estatisticas(self):
        estado = criar_estado_inicial(gerar_labirinto(13, 5))
        for usar_poda in (False, True):
            busca = buscar_melhor_movimento(estado, "azul", 3, usar_poda, registrar_arvore=True)
            self.assertEqual(contar_nos(busca.arvore, lambda no: not no.podado), busca.nos_visitados)
            self.assertEqual(contar_nos(busca.arvore, lambda no: no.podado), busca.ramos_podados)
            caminho_principal = obter_caminho_principal(busca.arvore)
            self.assertEqual(caminho_principal[1].movimento, busca.movimento)
            self.assertEqual(len(caminho_principal), 3 * 2 + 1)
            for no in caminho_principal:
                self.assertEqual(no.valor, busca.valor)
                self.assertEqual(no.tipo_do_valor, VALOR_EXATO)

    def test_nao_registra_arvore_quando_ela_nao_e_pedida(self):
        estado = criar_estado_inicial(gerar_labirinto(13, 5))
        self.assertIsNone(buscar_melhor_movimento(estado, "azul", 2).arvore)


class TestesDaBuscaComARaizEmParalelo(unittest.TestCase):
    def test_so_paraleliza_a_partir_da_profundidade_minima(self):
        self.assertFalse(deve_paralelizar_a_raiz(PROFUNDIDADE_MINIMA_PARA_PARALELIZAR - 1))
        self.assertTrue(deve_paralelizar_a_raiz(PROFUNDIDADE_MINIMA_PARA_PARALELIZAR))

    def test_encontra_a_mesma_jogada_e_o_mesmo_valor_que_a_busca_sequencial(self):
        for estado in gerar_estados_de_meio_de_jogo()[::3]:
            for jogador in ("azul", "laranja"):
                sequencial = buscar_melhor_movimento(estado, jogador, 3, paralelizar_a_raiz=False)
                paralela = buscar_melhor_movimento(estado, jogador, 3, paralelizar_a_raiz=True)
                self.assertEqual((paralela.movimento, paralela.valor), (sequencial.movimento, sequencial.valor))
                self.assertGreaterEqual(paralela.nos_visitados, sequencial.nos_visitados)

    def test_registra_uma_arvore_coerente_e_sem_poda_na_raiz(self):
        estado = criar_estado_inicial(gerar_labirinto(13, 5))
        busca = buscar_melhor_movimento(estado, "azul", 3, registrar_arvore=True, paralelizar_a_raiz=True)
        self.assertEqual(contar_nos(busca.arvore, lambda no: not no.podado), busca.nos_visitados)
        self.assertEqual(contar_nos(busca.arvore, lambda no: no.podado), busca.ramos_podados)
        self.assertEqual(obter_caminho_principal(busca.arvore)[1].movimento, busca.movimento)
        self.assertFalse(any(filho.podado for filho in busca.arvore.filhos))
        for filho in busca.arvore.filhos:
            self.assertEqual(filho.tipo_do_valor, VALOR_EXATO)


class TestesDasEstrategiasEDaPartida(unittest.TestCase):
    def test_estrategia_gulosa_foge_do_beco_sem_saida(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_BECO_SEM_SAIDA)
        decisao = decidir_movimento(estado, "azul", ConfiguracaoDoAgente("guloso"), random.Random(1))
        self.assertEqual(decisao.movimento, "baixo")

    def test_agente_aleatorio_escolhe_apenas_movimentos_seguros(self):
        estado = criar_estado_a_partir_do_mapa(MAPA_COM_BECO_SEM_SAIDA)
        gerador_aleatorio = random.Random(1)
        for _ in range(20):
            decisao = decidir_movimento(estado, "azul", ConfiguracaoDoAgente("aleatorio"), gerador_aleatorio)
            self.assertIn(decisao.movimento, ("direita", "baixo"))

    def test_partida_completa_termina_com_resultado_valido(self):
        configuracao_dos_agentes = {
            "azul": ConfiguracaoDoAgente("minimax", 2),
            "laranja": ConfiguracaoDoAgente("guloso"),
        }
        for semente in (1, 2, 3):
            registros = simular_partida_completa(13, semente, configuracao_dos_agentes)
            estado_final = registros[-1].estado_depois
            self.assertIn(vencedor_do_jogo(estado_final), ("azul", "laranja", "empate"))
            self.assertEqual(len(registros), estado_final.rodada)
            self.assertLessEqual(len(registros), 13 * 13)

    def test_minimax_mais_profundo_vence_o_mais_raso_na_maioria_dos_labirintos(self):
        configuracao_dos_agentes = {
            "azul": ConfiguracaoDoAgente("minimax", 3),
            "laranja": ConfiguracaoDoAgente("minimax", 1),
        }
        resultados = {"azul": 0, "laranja": 0, "empate": 0}
        for semente in range(1, 9):
            registros = simular_partida_completa(11, semente, configuracao_dos_agentes)
            resultados[vencedor_do_jogo(registros[-1].estado_depois)] += 1
        self.assertGreater(resultados["azul"], resultados["laranja"], resultados)


class TestesDaApi(unittest.TestCase):
    def test_fluxo_completo_da_api_gera_json_valido(self):
        partida = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 13, "semente": 7})
        configuracao_dos_agentes = {
            "azul": {"estrategia": "minimax", "profundidadeEmRodadas": 2, "usarPodaAlfaBeta": True},
            "laranja": {"estrategia": "aleatorio", "profundidadeEmRodadas": 1, "usarPodaAlfaBeta": True},
        }
        rodada = ROTAS_DA_API["/api/jogar-rodada"](
            {"estado": partida["estado"], "configuracaoDosAgentes": configuracao_dos_agentes, "semente": 7}
        )
        arvore = ROTAS_DA_API["/api/arvore"](
            {"estado": partida["estado"], "jogador": "azul", "configuracaoDoAgente": configuracao_dos_agentes["azul"]}
        )
        estado_do_no = ROTAS_DA_API["/api/estado-do-no"](
            {"estado": partida["estado"], "caminho": [{"jogador": "azul", "movimento": arvore["movimento"]}], "jogadorMaximizador": "azul"}
        )
        for resposta in (partida, rodada, arvore, estado_do_no):
            json.dumps(resposta, allow_nan=False)
        self.assertEqual(rodada["numeroDaRodada"], 1)
        self.assertIsNone(arvore["arvore"]["alfaNaEntrada"])
        self.assertEqual(estado_do_no["movimentoPendente"]["movimento"], arvore["movimento"])

    def test_recusa_desenhar_a_arvore_acima_da_profundidade_maxima_da_arvore(self):
        partida = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 13, "semente": 7})
        configuracao_profunda_demais = {
            "estrategia": "minimax",
            "profundidadeEmRodadas": PROFUNDIDADE_MAXIMA_DA_ARVORE + 1,
            "usarPodaAlfaBeta": True,
        }
        with self.assertRaises(ErroDeRequisicao):
            ROTAS_DA_API["/api/arvore"](
                {"estado": partida["estado"], "jogador": "azul", "configuracaoDoAgente": configuracao_profunda_demais}
            )

    def test_recusa_o_turbo_com_uma_mensagem_clara_quando_o_cpp_nao_esta_disponivel(self):
        partida = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 13, "semente": 7})
        configuracao_com_turbo = {"estrategia": "minimax", "profundidadeEmRodadas": 2, "usarTurbo": True}
        with mock.patch("logica.api.motivo_da_biblioteca_cpp_indisponivel", return_value="biblioteca ausente"):
            self.assertFalse(ROTAS_DA_API["/api/configuracao"]({})["turboDisponivel"])
            with self.assertRaisesRegex(ErroDeRequisicao, "biblioteca ausente"):
                ROTAS_DA_API["/api/jogar-rodada"](
                    {
                        "estado": partida["estado"],
                        "configuracaoDosAgentes": {"azul": configuracao_com_turbo, "laranja": configuracao_com_turbo},
                        "semente": 7,
                    }
                )

    def test_mesma_semente_gera_o_mesmo_labirinto_pela_api(self):
        primeira = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 17, "semente": 99})
        segunda = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 17, "semente": 99})
        self.assertEqual(primeira["estado"]["celulas"], segunda["estado"]["celulas"])


if __name__ == "__main__":
    unittest.main()
