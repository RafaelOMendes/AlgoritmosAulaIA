import random
import threading
import unittest

from logica.api import ROTAS_DA_API
from logica.jogo import aplicar_rodada, criar_estado_inicial, jogo_terminou, movimentos_possiveis
from logica.labirinto import gerar_labirinto
from logica.minimax import buscar_melhor_movimento
from logica.minimax_cpp_wrapper import buscar_melhor_movimento_cpp, motivo_da_biblioteca_cpp_indisponivel

MOTIVO_PARA_PULAR = motivo_da_biblioteca_cpp_indisponivel()


def gerar_estados_de_partidas_aleatorias(quantidade_de_partidas: int, tamanho: int):
    gerador_aleatorio = random.Random(4)
    for semente in range(1, quantidade_de_partidas + 1):
        estado = criar_estado_inicial(gerar_labirinto(tamanho, semente))
        while not jogo_terminou(estado):
            yield estado
            estado = aplicar_rodada(
                estado,
                gerador_aleatorio.choice(movimentos_possiveis(estado, "azul")),
                gerador_aleatorio.choice(movimentos_possiveis(estado, "laranja")),
            )


def resumir(busca):
    return busca.movimento, busca.valor, busca.nos_visitados, busca.ramos_podados


@unittest.skipIf(MOTIVO_PARA_PULAR, f"modo turbo indisponível: {MOTIVO_PARA_PULAR}")
class TestesDaVersaoEmCpp(unittest.TestCase):
    def test_da_exatamente_o_mesmo_resultado_que_o_python_com_a_raiz_em_paralelo(self):
        for estado in gerar_estados_de_partidas_aleatorias(5, 13):
            for jogador in ("azul", "laranja"):
                for profundidade in (1, 2, 3):
                    for usar_poda in (True, False):
                        python = buscar_melhor_movimento(
                            estado, jogador, profundidade, usar_poda, paralelizar_a_raiz=True
                        )
                        cpp = buscar_melhor_movimento_cpp(estado, jogador, profundidade, usar_poda)
                        self.assertEqual(resumir(cpp), resumir(python))

    def test_buscas_simultaneas_em_labirintos_de_tamanhos_diferentes_nao_se_misturam(self):
        estados = [criar_estado_inicial(gerar_labirinto(tamanho, 3)) for tamanho in (11, 13, 17, 21)]
        esperados = [resumir(buscar_melhor_movimento_cpp(estado, "azul", 4)) for estado in estados]
        resultados = {}

        def buscar_varias_vezes(indice):
            resultados[indice] = [resumir(buscar_melhor_movimento_cpp(estados[indice], "azul", 4)) for _ in range(5)]

        threads = [threading.Thread(target=buscar_varias_vezes, args=(indice,)) for indice in range(len(estados))]
        for thread in threads:
            thread.start()
        for thread in threads:
            thread.join()
        for indice, esperado in enumerate(esperados):
            self.assertEqual(resultados[indice], [esperado] * 5)

    def test_api_usa_o_cpp_quando_o_turbo_esta_ligado(self):
        partida = ROTAS_DA_API["/api/nova-partida"]({"tamanho": 13, "semente": 7})
        configuracao_com_turbo = {
            "estrategia": "minimax",
            "profundidadeEmRodadas": 3,
            "usarPodaAlfaBeta": True,
            "usarTurbo": True,
        }
        rodada = ROTAS_DA_API["/api/jogar-rodada"](
            {
                "estado": partida["estado"],
                "configuracaoDosAgentes": {"azul": configuracao_com_turbo, "laranja": configuracao_com_turbo},
                "semente": 7,
            }
        )
        arvore = ROTAS_DA_API["/api/arvore"](
            {"estado": partida["estado"], "jogador": "azul", "configuracaoDoAgente": configuracao_com_turbo}
        )
        decisao_do_azul = rodada["decisoes"]["azul"]
        self.assertEqual(decisao_do_azul["motor"], "cpp")
        self.assertEqual(rodada["decisoes"]["laranja"]["motor"], "cpp")
        self.assertEqual(
            (arvore["movimento"], arvore["valor"], arvore["nosVisitados"], arvore["ramosPodados"]),
            (
                decisao_do_azul["movimento"],
                decisao_do_azul["valor"],
                decisao_do_azul["nosVisitados"],
                decisao_do_azul["ramosPodados"],
            ),
        )


if __name__ == "__main__":
    unittest.main()
