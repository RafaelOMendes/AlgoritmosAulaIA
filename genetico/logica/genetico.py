import random
from dataclasses import dataclass, field

from .cidades import Ponto
from .distancias import comprimento_da_rota, criar_matriz_de_distancias

QUANTIDADE_MINIMA_DE_PONTOS = 4


@dataclass(frozen=True)
class ConfiguracaoDoAlgoritmo:
    tamanho_da_populacao: int = 120
    taxa_de_cruzamento: float = 0.9
    taxa_de_mutacao: float = 0.5
    quantidade_de_elite: int = 2
    tamanho_do_torneio: int = 3
    geracoes_sem_melhora_para_parar: int = 800


@dataclass(frozen=True)
class Individuo:
    rota: tuple[int, ...]
    distancia: float

    @property
    def aptidao(self) -> float:
        return 1 / self.distancia


@dataclass(frozen=True)
class ResultadoDoTorneio:
    participantes: tuple[Individuo, ...]
    vencedor: Individuo


@dataclass(frozen=True)
class ResultadoDoCruzamento:
    rota: tuple[int, ...]
    inicio_do_trecho: int
    fim_do_trecho: int


@dataclass(frozen=True)
class ResultadoDaMutacao:
    rota: tuple[int, ...]
    inicio_do_trecho: int
    fim_do_trecho: int


@dataclass(frozen=True)
class ExemploDeReproducao:
    torneio_do_pai_a: ResultadoDoTorneio
    torneio_do_pai_b: ResultadoDoTorneio
    cruzamento: ResultadoDoCruzamento | None
    rota_antes_da_mutacao: tuple[int, ...]
    mutacao: ResultadoDaMutacao | None
    filho: Individuo


@dataclass(frozen=True)
class EstatisticasDaGeracao:
    geracao: int
    melhor: float
    media: float
    pior: float


@dataclass
class AlgoritmoGenetico:
    pontos: list[Ponto]
    matriz_de_distancias: list[list[float]]
    gerador_aleatorio: random.Random
    populacao: list[Individuo]
    geracao: int = 0
    historico: list[EstatisticasDaGeracao] = field(default_factory=list)
    geracao_da_ultima_melhora: int = 0
    individuos_avaliados: int = 0
    exemplo_de_reproducao: ExemploDeReproducao | None = None


def criar_individuo(rota: tuple[int, ...], matriz_de_distancias: list[list[float]]) -> Individuo:
    return Individuo(rota=rota, distancia=comprimento_da_rota(rota, matriz_de_distancias))


def _ordenar_por_distancia(populacao: list[Individuo]) -> list[Individuo]:
    return sorted(populacao, key=lambda individuo: individuo.distancia)


def criar_populacao_inicial(
    quantidade_de_pontos: int,
    tamanho_da_populacao: int,
    matriz_de_distancias: list[list[float]],
    gerador_aleatorio: random.Random,
) -> list[Individuo]:
    rota_base = list(range(quantidade_de_pontos))
    populacao = [
        criar_individuo(tuple(gerador_aleatorio.sample(rota_base, quantidade_de_pontos)), matriz_de_distancias)
        for _ in range(tamanho_da_populacao)
    ]
    return _ordenar_por_distancia(populacao)


def selecionar_por_torneio(
    populacao: list[Individuo], tamanho_do_torneio: int, gerador_aleatorio: random.Random
) -> ResultadoDoTorneio:
    participantes = tuple(gerador_aleatorio.choice(populacao) for _ in range(tamanho_do_torneio))
    vencedor = min(participantes, key=lambda participante: participante.distancia)
    return ResultadoDoTorneio(participantes=participantes, vencedor=vencedor)


def _sortear_trecho(tamanho: int, gerador_aleatorio: random.Random) -> tuple[int, int]:
    primeiro = gerador_aleatorio.randint(0, tamanho - 1)
    segundo = gerador_aleatorio.randint(0, tamanho - 1)
    return min(primeiro, segundo), max(primeiro, segundo)


def cruzar_com_order_crossover(
    rota_do_pai_a: tuple[int, ...], rota_do_pai_b: tuple[int, ...], gerador_aleatorio: random.Random
) -> ResultadoDoCruzamento:
    tamanho = len(rota_do_pai_a)
    inicio, fim = _sortear_trecho(tamanho, gerador_aleatorio)
    rota_do_filho = [-1] * tamanho
    rota_do_filho[inicio : fim + 1] = rota_do_pai_a[inicio : fim + 1]
    pontos_herdados_do_pai_a = set(rota_do_pai_a[inicio : fim + 1])

    posicao_para_preencher = (fim + 1) % tamanho
    for deslocamento in range(tamanho):
        ponto_do_pai_b = rota_do_pai_b[(fim + 1 + deslocamento) % tamanho]
        if ponto_do_pai_b not in pontos_herdados_do_pai_a:
            rota_do_filho[posicao_para_preencher] = ponto_do_pai_b
            posicao_para_preencher = (posicao_para_preencher + 1) % tamanho
    return ResultadoDoCruzamento(rota=tuple(rota_do_filho), inicio_do_trecho=inicio, fim_do_trecho=fim)


def mutar_por_inversao(rota: tuple[int, ...], gerador_aleatorio: random.Random) -> ResultadoDaMutacao:
    inicio, fim = _sortear_trecho(len(rota), gerador_aleatorio)
    rota_mutada = rota[:inicio] + rota[inicio : fim + 1][::-1] + rota[fim + 1 :]
    return ResultadoDaMutacao(rota=rota_mutada, inicio_do_trecho=inicio, fim_do_trecho=fim)


def _calcular_estatisticas(geracao: int, populacao: list[Individuo]) -> EstatisticasDaGeracao:
    distancias = [individuo.distancia for individuo in populacao]
    return EstatisticasDaGeracao(
        geracao=geracao,
        melhor=distancias[0],
        media=sum(distancias) / len(distancias),
        pior=distancias[-1],
    )


def criar_algoritmo_genetico(
    pontos: list[Ponto], configuracao: ConfiguracaoDoAlgoritmo, semente: int
) -> AlgoritmoGenetico:
    if len(pontos) < QUANTIDADE_MINIMA_DE_PONTOS:
        raise ValueError(f"São necessários pelo menos {QUANTIDADE_MINIMA_DE_PONTOS} pontos.")
    gerador_aleatorio = random.Random(semente)
    matriz_de_distancias = criar_matriz_de_distancias(pontos)
    populacao = criar_populacao_inicial(
        len(pontos), configuracao.tamanho_da_populacao, matriz_de_distancias, gerador_aleatorio
    )
    return AlgoritmoGenetico(
        pontos=pontos,
        matriz_de_distancias=matriz_de_distancias,
        gerador_aleatorio=gerador_aleatorio,
        populacao=populacao,
        historico=[_calcular_estatisticas(0, populacao)],
        individuos_avaliados=len(populacao),
    )


def _gerar_filho(algoritmo: AlgoritmoGenetico, configuracao: ConfiguracaoDoAlgoritmo) -> ExemploDeReproducao:
    gerador_aleatorio = algoritmo.gerador_aleatorio
    torneio_do_pai_a = selecionar_por_torneio(algoritmo.populacao, configuracao.tamanho_do_torneio, gerador_aleatorio)
    torneio_do_pai_b = selecionar_por_torneio(algoritmo.populacao, configuracao.tamanho_do_torneio, gerador_aleatorio)

    cruzamento = None
    if gerador_aleatorio.random() < configuracao.taxa_de_cruzamento:
        cruzamento = cruzar_com_order_crossover(
            torneio_do_pai_a.vencedor.rota, torneio_do_pai_b.vencedor.rota, gerador_aleatorio
        )
    rota_antes_da_mutacao = cruzamento.rota if cruzamento else torneio_do_pai_a.vencedor.rota

    mutacao = None
    if gerador_aleatorio.random() < configuracao.taxa_de_mutacao:
        mutacao = mutar_por_inversao(rota_antes_da_mutacao, gerador_aleatorio)
    rota_final = mutacao.rota if mutacao else rota_antes_da_mutacao

    return ExemploDeReproducao(
        torneio_do_pai_a=torneio_do_pai_a,
        torneio_do_pai_b=torneio_do_pai_b,
        cruzamento=cruzamento,
        rota_antes_da_mutacao=rota_antes_da_mutacao,
        mutacao=mutacao,
        filho=criar_individuo(rota_final, algoritmo.matriz_de_distancias),
    )


def evoluir_uma_geracao(algoritmo: AlgoritmoGenetico, configuracao: ConfiguracaoDoAlgoritmo) -> None:
    quantidade_de_elite = min(configuracao.quantidade_de_elite, configuracao.tamanho_da_populacao)
    nova_populacao = algoritmo.populacao[:quantidade_de_elite]
    primeiro_exemplo = None

    while len(nova_populacao) < configuracao.tamanho_da_populacao:
        exemplo = _gerar_filho(algoritmo, configuracao)
        primeiro_exemplo = primeiro_exemplo or exemplo
        nova_populacao.append(exemplo.filho)

    melhor_distancia_anterior = algoritmo.populacao[0].distancia
    algoritmo.populacao = _ordenar_por_distancia(nova_populacao)
    algoritmo.geracao += 1
    algoritmo.individuos_avaliados += configuracao.tamanho_da_populacao - quantidade_de_elite
    algoritmo.exemplo_de_reproducao = primeiro_exemplo
    algoritmo.historico.append(_calcular_estatisticas(algoritmo.geracao, algoritmo.populacao))
    if algoritmo.populacao[0].distancia < melhor_distancia_anterior - 1e-9:
        algoritmo.geracao_da_ultima_melhora = algoritmo.geracao


def algoritmo_convergiu(algoritmo: AlgoritmoGenetico, configuracao: ConfiguracaoDoAlgoritmo) -> bool:
    return algoritmo.geracao - algoritmo.geracao_da_ultima_melhora >= configuracao.geracoes_sem_melhora_para_parar


def melhor_individuo(algoritmo: AlgoritmoGenetico) -> Individuo:
    return algoritmo.populacao[0]


def contar_rotas_distintas(populacao: list[Individuo]) -> int:
    return len({individuo.rota for individuo in populacao})
