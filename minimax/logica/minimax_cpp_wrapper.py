import ctypes
import os
import math
import time
from .jogo import Estado, movimentos_possiveis
from .minimax import ResultadoDaBusca, NoDaArvore

# Define as direções para fazer o mapeamento reverso
DIRECOES = ["cima", "direita", "baixo", "esquerda"]

def buscar_melhor_movimento_cpp(
    estado: Estado,
    jogador_maximizador: str,
    profundidade_em_rodadas: int,
    usar_poda_alfa_beta: bool = True,
    registrar_arvore: bool = False,
) -> ResultadoDaBusca:
    
    # 1. Carregar a biblioteca compartilhada (compilada no Linux/WSL como minimax_cpp_lib.so)
    caminho_lib = os.path.join(os.path.dirname(__file__), "minimax_cpp_lib.so")
    
    if not os.path.exists(caminho_lib):
        raise FileNotFoundError(f"A biblioteca compilada não foi encontrada em {caminho_lib}. Compile o minimax.cpp usando g++ -shared -fPIC -O3 -std=c++11 -pthread minimax.cpp -o minimax_cpp_lib.so")
        
    lib = ctypes.CDLL(caminho_lib)
    
    # void buscar_melhor_movimento_cpp(int tamanho, uint8_t* celulas_ptr, int pos_azul, int pos_laranja, bool vivo_azul, bool vivo_laranja, bool max_eh_azul, int profundidade, bool usar_poda, int* out_melhor_mov, int* out_valor, int* out_nos, int* out_podas)
    lib.buscar_melhor_movimento_cpp.argtypes = [
        ctypes.c_int, ctypes.POINTER(ctypes.c_uint8), 
        ctypes.c_int, ctypes.c_int, 
        ctypes.c_bool, ctypes.c_bool, 
        ctypes.c_bool, ctypes.c_int, ctypes.c_bool,
        ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int), ctypes.POINTER(ctypes.c_int)
    ]
    
    # Prepara os dados para o C++
    tamanho = estado.tamanho
    CelulasArray = ctypes.c_uint8 * len(estado.celulas)
    celulas_c = CelulasArray(*estado.celulas)
    pos_azul = estado.posicoes["azul"]
    pos_laranja = estado.posicoes["laranja"]
    vivo_azul = estado.vivos["azul"]
    vivo_laranja = estado.vivos["laranja"]
    max_eh_azul = (jogador_maximizador == "azul")
    
    # Variáveis de retorno
    out_melhor_mov = ctypes.c_int(0)
    out_valor = ctypes.c_int(0)
    out_nos = ctypes.c_int(0)
    out_podas = ctypes.c_int(0)
    
    inicio = time.perf_counter()
    
    # Chama a função C++
    lib.buscar_melhor_movimento_cpp(
        tamanho, celulas_c, pos_azul, pos_laranja, vivo_azul, vivo_laranja, 
        max_eh_azul, profundidade_em_rodadas, usar_poda_alfa_beta,
        ctypes.byref(out_melhor_mov), ctypes.byref(out_valor), ctypes.byref(out_nos), ctypes.byref(out_podas)
    )
    
    tempo_em_milissegundos = (time.perf_counter() - inicio) * 1000
    
    melhor_movimento_str = DIRECOES[out_melhor_mov.value]
    
    # Como C++ não constrói a árvore de registro, retornamos None se pedido
    return ResultadoDaBusca(
        jogador_maximizador=jogador_maximizador,
        profundidade_em_rodadas=profundidade_em_rodadas,
        usar_poda_alfa_beta=usar_poda_alfa_beta,
        movimento=melhor_movimento_str,
        valor=out_valor.value,
        nos_visitados=out_nos.value,
        ramos_podados=out_podas.value,
        tempo_em_milissegundos=tempo_em_milissegundos,
        arvore=None, # Árvore gráfica desabilitada no C++ para máxima velocidade
    )
