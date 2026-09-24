import random
import threading
import uuid
from collections import OrderedDict

from .cidades import CIDADES_DO_BRASIL, Ponto, listar_capitais, sortear_cidades
from .distancias import distancias_dos_trechos
from .genetico import (
    QUANTIDADE_MINIMA_DE_PONTOS,
    AlgoritmoGenetico,
    ConfiguracaoDoAlgoritmo,
    EstatisticasDaGeracao,
    ExemploDeReproducao,
    ResultadoDoTorneio,
    algoritmo_convergiu,
    contar_rotas_distintas,
    criar_algoritmo_genetico,
    evoluir_uma_geracao,
    melhor_individuo,
)

QUANTIDADE_MAXIMA_DE_PONTOS = 150
LIMITE_DE_GERACOES_POR_PEDIDO = 500
LIMITE_DE_EXECUCOES_GUARDADAS = 20

_execucoes: OrderedDict[str, AlgoritmoGenetico] = OrderedDict()
_trava_das_execucoes = threading.Lock()


class ErroDeRequisicao(ValueError):
    pass


def _exigir(condicao: bool, mensagem: str) -> None:
    if not condicao:
        raise ErroDeRequisicao(mensagem)


def _numero_no_intervalo(dados: dict, chave: str, minimo: float, maximo: float, padrao: float) -> float:
    valor = float(dados.get(chave, padrao))
    _exigir(minimo <= valor <= maximo, f"{chave} deve ficar entre {minimo} e {maximo}.")
    return valor


def ponto_para_json(ponto: Ponto) -> dict:
    return {"nome": ponto.nome, "uf": ponto.uf, "latitude": ponto.latitude, "longitude": ponto.longitude}


def ponto_de_json(dados: dict) -> Ponto:
    latitude = float(dados["latitude"])
    longitude = float(dados["longitude"])
    _exigir(-90 <= latitude <= 90 and -180 <= longitude <= 180, "Coordenadas fora do mapa.")
    return Ponto(nome=str(dados.get("nome", "Ponto")), uf=str(dados.get("uf") or ""), latitude=latitude, longitude=longitude)


def configuracao_de_json(dados: dict) -> ConfiguracaoDoAlgoritmo:
    padrao = ConfiguracaoDoAlgoritmo()
    return ConfiguracaoDoAlgoritmo(
        tamanho_da_populacao=int(_numero_no_intervalo(dados, "tamanhoDaPopulacao", 4, 1000, padrao.tamanho_da_populacao)),
        taxa_de_cruzamento=_numero_no_intervalo(dados, "taxaDeCruzamento", 0, 1, padrao.taxa_de_cruzamento),
        taxa_de_mutacao=_numero_no_intervalo(dados, "taxaDeMutacao", 0, 1, padrao.taxa_de_mutacao),
        quantidade_de_elite=int(_numero_no_intervalo(dados, "quantidadeDeElite", 0, 50, padrao.quantidade_de_elite)),
        tamanho_do_torneio=int(_numero_no_intervalo(dados, "tamanhoDoTorneio", 1, 50, padrao.tamanho_do_torneio)),
        geracoes_sem_melhora_para_parar=int(
            _numero_no_intervalo(dados, "geracoesSemMelhoraParaParar", 1, 100_000, padrao.geracoes_sem_melhora_para_parar)
        ),
    )


def estatisticas_para_json(estatisticas: EstatisticasDaGeracao) -> dict:
    return {
        "geracao": estatisticas.geracao,
        "melhor": estatisticas.melhor,
        "media": estatisticas.media,
        "pior": estatisticas.pior,
    }


def torneio_para_json(torneio: ResultadoDoTorneio) -> dict:
    return {
        "distancias": [participante.distancia for participante in torneio.participantes],
        "indiceDoVencedor": torneio.participantes.index(torneio.vencedor),
        "rotaDoVencedor": list(torneio.vencedor.rota),
        "distanciaDoVencedor": torneio.vencedor.distancia,
    }


def exemplo_para_json(exemplo: ExemploDeReproducao | None) -> dict | None:
    if exemplo is None:
        return None
    return {
        "torneioDoPaiA": torneio_para_json(exemplo.torneio_do_pai_a),
        "torneioDoPaiB": torneio_para_json(exemplo.torneio_do_pai_b),
        "cruzamento": (
            {
                "rota": list(exemplo.cruzamento.rota),
                "inicioDoTrecho": exemplo.cruzamento.inicio_do_trecho,
                "fimDoTrecho": exemplo.cruzamento.fim_do_trecho,
            }
            if exemplo.cruzamento
            else None
        ),
        "rotaAntesDaMutacao": list(exemplo.rota_antes_da_mutacao),
        "mutacao": (
            {
                "rota": list(exemplo.mutacao.rota),
                "inicioDoTrecho": exemplo.mutacao.inicio_do_trecho,
                "fimDoTrecho": exemplo.mutacao.fim_do_trecho,
            }
            if exemplo.mutacao
            else None
        ),
        "filho": {"rota": list(exemplo.filho.rota), "distancia": exemplo.filho.distancia},
    }


def instantaneo_para_json(
    identificador: str, algoritmo: AlgoritmoGenetico, configuracao: ConfiguracaoDoAlgoritmo, desde_a_geracao: int
) -> dict:
    melhor = melhor_individuo(algoritmo)
    return {
        "id": identificador,
        "geracao": algoritmo.geracao,
        "geracaoDaUltimaMelhora": algoritmo.geracao_da_ultima_melhora,
        "individuosAvaliados": algoritmo.individuos_avaliados,
        "tamanhoDaPopulacao": len(algoritmo.populacao),
        "rotasDistintas": contar_rotas_distintas(algoritmo.populacao),
        "convergiu": algoritmo_convergiu(algoritmo, configuracao),
        "distanciaInicial": algoritmo.historico[0].melhor,
        "melhor": {
            "rota": list(melhor.rota),
            "distancia": melhor.distancia,
            "trechos": distancias_dos_trechos(melhor.rota, algoritmo.matriz_de_distancias),
        },
        "historicoNovo": [
            estatisticas_para_json(estatisticas) for estatisticas in algoritmo.historico[max(0, desde_a_geracao + 1) :]
        ],
        "exemploDeReproducao": exemplo_para_json(algoritmo.exemplo_de_reproducao),
    }


def _guardar_execucao(algoritmo: AlgoritmoGenetico) -> str:
    identificador = uuid.uuid4().hex
    with _trava_das_execucoes:
        _execucoes[identificador] = algoritmo
        while len(_execucoes) > LIMITE_DE_EXECUCOES_GUARDADAS:
            _execucoes.popitem(last=False)
    return identificador


def _buscar_execucao(identificador: str) -> AlgoritmoGenetico:
    with _trava_das_execucoes:
        algoritmo = _execucoes.get(identificador)
        if algoritmo is not None:
            _execucoes.move_to_end(identificador)
    _exigir(algoritmo is not None, "Execução não encontrada. Reinicie a população.")
    return algoritmo


def listar_capitais_do_brasil(dados: dict) -> dict:
    return {"pontos": [ponto_para_json(ponto) for ponto in listar_capitais()]}


def sortear_cidades_do_brasil(dados: dict) -> dict:
    quantidade = int(_numero_no_intervalo(dados, "quantidade", QUANTIDADE_MINIMA_DE_PONTOS, len(CIDADES_DO_BRASIL), 20))
    gerador_aleatorio = random.Random(dados.get("semente"))
    return {"pontos": [ponto_para_json(ponto) for ponto in sortear_cidades(quantidade, gerador_aleatorio)]}


def iniciar_algoritmo(dados: dict) -> dict:
    pontos = [ponto_de_json(ponto) for ponto in dados["pontos"]]
    _exigir(
        QUANTIDADE_MINIMA_DE_PONTOS <= len(pontos) <= QUANTIDADE_MAXIMA_DE_PONTOS,
        f"Use entre {QUANTIDADE_MINIMA_DE_PONTOS} e {QUANTIDADE_MAXIMA_DE_PONTOS} pontos.",
    )
    configuracao = configuracao_de_json(dados.get("configuracao", {}))
    semente = int(dados["semente"]) if dados.get("semente") is not None else random.randrange(1_000_000)
    algoritmo = criar_algoritmo_genetico(pontos, configuracao, semente)
    identificador = _guardar_execucao(algoritmo)
    return instantaneo_para_json(identificador, algoritmo, configuracao, -1)


def evoluir_algoritmo(dados: dict) -> dict:
    identificador = str(dados["id"])
    algoritmo = _buscar_execucao(identificador)
    configuracao = configuracao_de_json(dados.get("configuracao", {}))
    quantidade_de_geracoes = int(_numero_no_intervalo(dados, "geracoes", 1, LIMITE_DE_GERACOES_POR_PEDIDO, 1))
    for _ in range(quantidade_de_geracoes):
        if algoritmo_convergiu(algoritmo, configuracao):
            break
        evoluir_uma_geracao(algoritmo, configuracao)
    return instantaneo_para_json(identificador, algoritmo, configuracao, int(dados.get("desdeAGeracao", -1)))


ROTAS_DA_API = {
    "/api/capitais": listar_capitais_do_brasil,
    "/api/sortear-cidades": sortear_cidades_do_brasil,
    "/api/iniciar": iniciar_algoritmo,
    "/api/evoluir": evoluir_algoritmo,
}
