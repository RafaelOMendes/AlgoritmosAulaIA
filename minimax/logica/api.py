import math
import random

from .avaliacao import Territorios, calcular_territorios
from .estrategias import ESTRATEGIAS, ConfiguracaoDoAgente, DecisaoDoAgente
from .jogo import JOGADORES, Estado, criar_estado_inicial, jogo_terminou, vencedor_do_jogo
from .labirinto import TAMANHO_MINIMO_DO_LABIRINTO, gerar_labirinto
from .minimax import VALOR_DE_EMPATE, VALOR_DE_VITORIA, NoDaArvore
from .partida import (
    PassoDoCaminho,
    criar_gerador_da_rodada,
    jogar_rodada,
    reconstruir_arvore_de_decisao,
    reconstruir_estado_do_no,
)
from .tabuleiro import DESLOCAMENTO_DE_CADA_DIRECAO, vizinho_na_direcao

TAMANHO_MAXIMO_DO_LABIRINTO = 31
PROFUNDIDADE_MINIMA = 1
PROFUNDIDADE_MAXIMA = 7
PROFUNDIDADE_MAXIMA_DA_ARVORE = 5


class ErroDeRequisicao(ValueError):
    pass


def _exigir(condicao: bool, mensagem: str) -> None:
    if not condicao:
        raise ErroDeRequisicao(mensagem)


def _numero_ou_nulo(valor: float | None) -> float | None:
    if valor is None or math.isinf(valor):
        return None
    return valor


def estado_para_json(estado: Estado) -> dict:
    return {
        "tamanho": estado.tamanho,
        "celulas": list(estado.celulas),
        "posicoes": dict(estado.posicoes),
        "trilhas": {jogador: list(trilha) for jogador, trilha in estado.trilhas.items()},
        "vivos": dict(estado.vivos),
        "rodada": estado.rodada,
        "ultimosMovimentos": dict(estado.ultimos_movimentos),
        "pontosDeColisao": dict(estado.pontos_de_colisao),
    }


def estado_de_json(dados: dict) -> Estado:
    tamanho = int(dados["tamanho"])
    celulas = bytearray(int(celula) for celula in dados["celulas"])
    _exigir(len(celulas) == tamanho * tamanho, "O estado enviado não corresponde ao tamanho do tabuleiro.")
    return Estado(
        tamanho=tamanho,
        celulas=celulas,
        posicoes={jogador: int(dados["posicoes"][jogador]) for jogador in JOGADORES},
        trilhas={jogador: [int(indice) for indice in dados["trilhas"][jogador]] for jogador in JOGADORES},
        vivos={jogador: bool(dados["vivos"][jogador]) for jogador in JOGADORES},
        rodada=int(dados["rodada"]),
        ultimos_movimentos={jogador: dados["ultimosMovimentos"].get(jogador) for jogador in JOGADORES},
        pontos_de_colisao={jogador: dados["pontosDeColisao"].get(jogador) for jogador in JOGADORES},
    )


def territorios_para_json(territorios: Territorios) -> dict:
    return {
        "azul": territorios.azul,
        "laranja": territorios.laranja,
        "disputadas": territorios.disputadas,
        "donoDeCadaCelula": list(territorios.dono_de_cada_celula),
    }


def decisao_para_json(decisao: DecisaoDoAgente) -> dict:
    return {
        "estrategia": decisao.estrategia,
        "movimento": decisao.movimento,
        "valor": decisao.valor,
        "nosVisitados": decisao.nos_visitados,
        "ramosPodados": decisao.ramos_podados,
        "tempoEmMilissegundos": decisao.tempo_em_milissegundos,
    }


def no_para_json(no: NoDaArvore) -> dict:
    return {
        "tipo": no.tipo,
        "jogadorDaVez": no.jogador_da_vez,
        "jogadorQueMoveu": no.jogador_que_moveu,
        "movimento": no.movimento,
        "alfaNaEntrada": _numero_ou_nulo(no.alfa_na_entrada),
        "betaNaEntrada": _numero_ou_nulo(no.beta_na_entrada),
        "valor": _numero_ou_nulo(no.valor),
        "tipoDoValor": no.tipo_do_valor,
        "indiceDoMelhorFilho": no.indice_do_melhor_filho,
        "podado": no.podado,
        "desfecho": no.desfecho,
        "avaliacao": (
            {
                "valor": no.avaliacao.valor,
                "territorioDoMaximizador": no.avaliacao.territorio_do_maximizador,
                "territorioDoMinimizador": no.avaliacao.territorio_do_minimizador,
            }
            if no.avaliacao
            else None
        ),
        "filhos": [no_para_json(filho) for filho in no.filhos],
    }


def configuracao_do_agente_de_json(dados: dict) -> ConfiguracaoDoAgente:
    estrategia = dados.get("estrategia", "minimax")
    profundidade = int(dados.get("profundidadeEmRodadas", 1))
    _exigir(estrategia in ESTRATEGIAS, f"Estratégia desconhecida: {estrategia}.")
    _exigir(
        PROFUNDIDADE_MINIMA <= profundidade <= PROFUNDIDADE_MAXIMA,
        f"A profundidade deve ficar entre {PROFUNDIDADE_MINIMA} e {PROFUNDIDADE_MAXIMA}.",
    )
    return ConfiguracaoDoAgente(
        estrategia=estrategia,
        profundidade_em_rodadas=profundidade,
        usar_poda_alfa_beta=bool(dados.get("usarPodaAlfaBeta", True)),
    )


def obter_configuracao(dados: dict) -> dict:
    return {
        "estrategias": [
            {"chave": chave, "nome": estrategia.nome, "usaProfundidade": estrategia.usa_profundidade}
            for chave, estrategia in ESTRATEGIAS.items()
        ],
        "direcoes": list(DESLOCAMENTO_DE_CADA_DIRECAO),
        "valorDeVitoria": VALOR_DE_VITORIA,
        "valorDeEmpate": VALOR_DE_EMPATE,
        "profundidadeMinima": PROFUNDIDADE_MINIMA,
        "profundidadeMaxima": PROFUNDIDADE_MAXIMA,
    }


def criar_nova_partida(dados: dict) -> dict:
    tamanho = int(dados.get("tamanho", 17))
    _exigir(
        TAMANHO_MINIMO_DO_LABIRINTO <= tamanho <= TAMANHO_MAXIMO_DO_LABIRINTO,
        f"O tamanho deve ficar entre {TAMANHO_MINIMO_DO_LABIRINTO} e {TAMANHO_MAXIMO_DO_LABIRINTO}.",
    )
    semente = int(dados["semente"]) if dados.get("semente") is not None else random.randrange(1_000_000)
    labirinto = gerar_labirinto(tamanho, semente)
    estado = criar_estado_inicial(labirinto)
    return {
        "semente": semente,
        "estado": estado_para_json(estado),
        "territorios": territorios_para_json(calcular_territorios(estado)),
    }


def jogar_proxima_rodada(dados: dict) -> dict:
    estado = estado_de_json(dados["estado"])
    _exigir(not jogo_terminou(estado), "A partida já terminou.")
    configuracao_dos_agentes = {
        jogador: configuracao_do_agente_de_json(dados["configuracaoDosAgentes"][jogador]) for jogador in JOGADORES
    }
    gerador_aleatorio = criar_gerador_da_rodada(int(dados.get("semente", 0)), estado.rodada)
    registro = jogar_rodada(estado, configuracao_dos_agentes, gerador_aleatorio)
    return {
        "numeroDaRodada": registro.numero_da_rodada,
        "estadoDepois": estado_para_json(registro.estado_depois),
        "decisoes": {jogador: decisao_para_json(decisao) for jogador, decisao in registro.decisoes.items()},
        "causasDasColisoes": registro.causas_das_colisoes,
        "vencedor": vencedor_do_jogo(registro.estado_depois),
        "territorios": territorios_para_json(calcular_territorios(registro.estado_depois)),
    }


def montar_arvore_de_decisao(dados: dict) -> dict:
    estado = estado_de_json(dados["estado"])
    jogador = dados["jogador"]
    _exigir(jogador in JOGADORES, "Jogador desconhecido.")
    configuracao = configuracao_do_agente_de_json(dados["configuracaoDoAgente"])
    _exigir(configuracao.estrategia == "minimax", "Só agentes que usam Minimax têm árvore de decisão.")
    _exigir(
        configuracao.profundidade_em_rodadas <= PROFUNDIDADE_MAXIMA_DA_ARVORE,
        f"A árvore só é desenhada até a profundidade {PROFUNDIDADE_MAXIMA_DA_ARVORE}: "
        "acima disso ela passa de centenas de milhares de nós.",
    )
    busca = reconstruir_arvore_de_decisao(estado, jogador, configuracao)
    return {
        "jogadorMaximizador": busca.jogador_maximizador,
        "profundidadeEmRodadas": busca.profundidade_em_rodadas,
        "usarPodaAlfaBeta": busca.usar_poda_alfa_beta,
        "movimento": busca.movimento,
        "valor": busca.valor,
        "nosVisitados": busca.nos_visitados,
        "ramosPodados": busca.ramos_podados,
        "tempoEmMilissegundos": busca.tempo_em_milissegundos,
        "arvore": no_para_json(busca.arvore),
    }


def obter_estado_do_no(dados: dict) -> dict:
    estado_raiz = estado_de_json(dados["estado"])
    caminho = [PassoDoCaminho(passo["jogador"], passo["movimento"]) for passo in dados["caminho"]]
    estado, movimento_pendente = reconstruir_estado_do_no(estado_raiz, caminho, dados["jogadorMaximizador"])
    return {
        "estado": estado_para_json(estado),
        "territorios": territorios_para_json(calcular_territorios(estado)),
        "movimentoPendente": (
            {
                "jogador": movimento_pendente.jogador,
                "movimento": movimento_pendente.movimento,
                "destino": vizinho_na_direcao(
                    estado.tamanho, estado.posicoes[movimento_pendente.jogador], movimento_pendente.movimento
                ),
            }
            if movimento_pendente
            else None
        ),
    }


ROTAS_DA_API = {
    "/api/configuracao": obter_configuracao,
    "/api/nova-partida": criar_nova_partida,
    "/api/jogar-rodada": jogar_proxima_rodada,
    "/api/arvore": montar_arvore_de_decisao,
    "/api/estado-do-no": obter_estado_do_no,
}
