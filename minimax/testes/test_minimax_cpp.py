import random
import unittest

from logica.jogo import aplicar_rodada, criar_estado_inicial, jogo_terminou, movimentos_possiveis, movimentos_seguros
from logica.labirinto import gerar_labirinto
from logica.minimax import buscar_melhor_movimento
from logica.minimax_cpp_wrapper import BibliotecaCppIndisponivel, buscar_melhor_movimento_cpp, carregar_biblioteca_cpp


def biblioteca_cpp_carregou() -> bool:
    try:
        carregar_biblioteca_cpp()
    except BibliotecaCppIndisponivel:
        return False
    return True


@unittest.skipUnless(biblioteca_cpp_carregou(), "a biblioteca C++ não está compilada para este sistema")
class TestesDaVersaoEmCpp(unittest.TestCase):
    def test_concorda_com_a_versao_em_python(self):
        gerador_aleatorio = random.Random(4)
        for semente in range(1, 6):
            estado = criar_estado_inicial(gerar_labirinto(13, semente))
            while not jogo_terminou(estado):
                for jogador in ("azul", "laranja"):
                    for profundidade in (1, 2, 3):
                        python = buscar_melhor_movimento(estado, jogador, profundidade, paralelizar_a_raiz=True)
                        cpp = buscar_melhor_movimento_cpp(estado, jogador, profundidade)
                        self.assertEqual(cpp.valor, python.valor)
                        self.assertEqual(cpp.nos_visitados, python.nos_visitados)
                        if movimentos_seguros(estado, jogador):
                            self.assertEqual(cpp.movimento, python.movimento)
                estado = aplicar_rodada(
                    estado,
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "azul")),
                    gerador_aleatorio.choice(movimentos_possiveis(estado, "laranja")),
                )


if __name__ == "__main__":
    unittest.main()
