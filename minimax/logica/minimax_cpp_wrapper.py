import ctypes
import sys
import time
from functools import lru_cache
from pathlib import Path

from .jogo import Estado
from .minimax import ResultadoDaBusca
from .tabuleiro import ORDEM_DAS_DIRECOES

VERSAO_DA_INTERFACE_ESPERADA = 2
SEM_MOVIMENTO = -1
NOME_DA_BIBLIOTECA = "minimax_cpp_lib.dll" if sys.platform == "win32" else "minimax_cpp_lib.so"
CAMINHO_DA_BIBLIOTECA = Path(__file__).with_name(NOME_DA_BIBLIOTECA)
INSTRUCAO_PARA_COMPILAR = "Compile a versão em C++ com: python compilar_cpp.py (dentro da pasta minimax)."


class BibliotecaCppIndisponivel(RuntimeError):
    pass


@lru_cache(maxsize=1)
def carregar_biblioteca_cpp() -> ctypes.CDLL:
    if not CAMINHO_DA_BIBLIOTECA.exists():
        raise BibliotecaCppIndisponivel(f"a biblioteca {NOME_DA_BIBLIOTECA} não existe. {INSTRUCAO_PARA_COMPILAR}")
    try:
        biblioteca = ctypes.CDLL(str(CAMINHO_DA_BIBLIOTECA))
    except OSError as erro:
        raise BibliotecaCppIndisponivel(
            f"não foi possível carregar {NOME_DA_BIBLIOTECA} ({erro}). {INSTRUCAO_PARA_COMPILAR}"
        ) from erro

    versao_da_biblioteca = (
        biblioteca.versao_da_interface_cpp() if hasattr(biblioteca, "versao_da_interface_cpp") else None
    )
    if versao_da_biblioteca != VERSAO_DA_INTERFACE_ESPERADA:
        raise BibliotecaCppIndisponivel(f"a biblioteca {NOME_DA_BIBLIOTECA} está desatualizada. {INSTRUCAO_PARA_COMPILAR}")

    biblioteca.buscar_melhor_movimento_cpp.argtypes = [
        ctypes.c_int,
        ctypes.POINTER(ctypes.c_uint8),
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_bool,
        ctypes.c_bool,
        ctypes.c_int,
        ctypes.c_int,
        ctypes.c_bool,
        ctypes.c_int,
        ctypes.c_bool,
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
        ctypes.POINTER(ctypes.c_int),
    ]
    biblioteca.buscar_melhor_movimento_cpp.restype = None
    return biblioteca


def motivo_da_biblioteca_cpp_indisponivel() -> str | None:
    try:
        carregar_biblioteca_cpp()
    except BibliotecaCppIndisponivel as erro:
        return str(erro)
    return None


def _indice_do_movimento(movimento: str | None) -> int:
    return ORDEM_DAS_DIRECOES.index(movimento) if movimento else SEM_MOVIMENTO


def buscar_melhor_movimento_cpp(
    estado: Estado,
    jogador_maximizador: str,
    profundidade_em_rodadas: int,
    usar_poda_alfa_beta: bool = True,
) -> ResultadoDaBusca:
    biblioteca = carregar_biblioteca_cpp()
    celulas_para_o_cpp = (ctypes.c_uint8 * len(estado.celulas)).from_buffer_copy(estado.celulas)
    indice_da_melhor_direcao = ctypes.c_int(0)
    valor = ctypes.c_int(0)
    nos_visitados = ctypes.c_int(0)
    ramos_podados = ctypes.c_int(0)

    inicio = time.perf_counter()
    biblioteca.buscar_melhor_movimento_cpp(
        estado.tamanho,
        celulas_para_o_cpp,
        estado.posicoes["azul"],
        estado.posicoes["laranja"],
        estado.vivos["azul"],
        estado.vivos["laranja"],
        _indice_do_movimento(estado.ultimos_movimentos["azul"]),
        _indice_do_movimento(estado.ultimos_movimentos["laranja"]),
        jogador_maximizador == "azul",
        profundidade_em_rodadas,
        usar_poda_alfa_beta,
        ctypes.byref(indice_da_melhor_direcao),
        ctypes.byref(valor),
        ctypes.byref(nos_visitados),
        ctypes.byref(ramos_podados),
    )
    tempo_em_milissegundos = (time.perf_counter() - inicio) * 1000

    return ResultadoDaBusca(
        jogador_maximizador=jogador_maximizador,
        profundidade_em_rodadas=profundidade_em_rodadas,
        usar_poda_alfa_beta=usar_poda_alfa_beta,
        movimento=ORDEM_DAS_DIRECOES[indice_da_melhor_direcao.value],
        valor=valor.value,
        nos_visitados=nos_visitados.value,
        ramos_podados=ramos_podados.value,
        tempo_em_milissegundos=tempo_em_milissegundos,
        arvore=None,
    )
