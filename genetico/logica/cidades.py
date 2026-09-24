import random
from dataclasses import dataclass


@dataclass(frozen=True)
class Ponto:
    nome: str
    uf: str
    latitude: float
    longitude: float
    capital: bool = False


CIDADES_DO_BRASIL = (
    Ponto("Rio Branco", "AC", -9.9747, -67.8243, True),
    Ponto("Maceió", "AL", -9.6658, -35.7353, True),
    Ponto("Macapá", "AP", 0.0349, -51.0694, True),
    Ponto("Manaus", "AM", -3.119, -60.0217, True),
    Ponto("Salvador", "BA", -12.9714, -38.5014, True),
    Ponto("Fortaleza", "CE", -3.7319, -38.5267, True),
    Ponto("Brasília", "DF", -15.7939, -47.8828, True),
    Ponto("Vitória", "ES", -20.3155, -40.3128, True),
    Ponto("Goiânia", "GO", -16.6869, -49.2648, True),
    Ponto("São Luís", "MA", -2.5307, -44.3068, True),
    Ponto("Cuiabá", "MT", -15.6014, -56.0979, True),
    Ponto("Campo Grande", "MS", -20.4697, -54.6201, True),
    Ponto("Belo Horizonte", "MG", -19.9167, -43.9345, True),
    Ponto("Belém", "PA", -1.4558, -48.4902, True),
    Ponto("João Pessoa", "PB", -7.1195, -34.845, True),
    Ponto("Curitiba", "PR", -25.4284, -49.2733, True),
    Ponto("Recife", "PE", -8.0476, -34.877, True),
    Ponto("Teresina", "PI", -5.092, -42.8038, True),
    Ponto("Rio de Janeiro", "RJ", -22.9068, -43.1729, True),
    Ponto("Natal", "RN", -5.7945, -35.211, True),
    Ponto("Porto Alegre", "RS", -30.0346, -51.2177, True),
    Ponto("Porto Velho", "RO", -8.7612, -63.9004, True),
    Ponto("Boa Vista", "RR", 2.8235, -60.6758, True),
    Ponto("Florianópolis", "SC", -27.5954, -48.548, True),
    Ponto("São Paulo", "SP", -23.5505, -46.6333, True),
    Ponto("Aracaju", "SE", -10.9472, -37.0731, True),
    Ponto("Palmas", "TO", -10.2491, -48.3243, True),
    Ponto("Campinas", "SP", -22.9099, -47.0626, False),
    Ponto("Santos", "SP", -23.9608, -46.3336, False),
    Ponto("Ribeirão Preto", "SP", -21.1775, -47.8103, False),
    Ponto("Sorocaba", "SP", -23.5015, -47.4526, False),
    Ponto("São José dos Campos", "SP", -23.1791, -45.8872, False),
    Ponto("Bauru", "SP", -22.3246, -49.0871, False),
    Ponto("Presidente Prudente", "SP", -22.1256, -51.3889, False),
    Ponto("São José do Rio Preto", "SP", -20.8113, -49.3758, False),
    Ponto("Uberlândia", "MG", -18.9186, -48.2772, False),
    Ponto("Juiz de Fora", "MG", -21.7642, -43.3496, False),
    Ponto("Montes Claros", "MG", -16.735, -43.8617, False),
    Ponto("Uberaba", "MG", -19.7472, -47.9381, False),
    Ponto("Governador Valadares", "MG", -18.8511, -41.9494, False),
    Ponto("Londrina", "PR", -23.3045, -51.1696, False),
    Ponto("Maringá", "PR", -23.4205, -51.9333, False),
    Ponto("Cascavel", "PR", -24.9555, -53.4552, False),
    Ponto("Foz do Iguaçu", "PR", -25.5163, -54.5854, False),
    Ponto("Ponta Grossa", "PR", -25.0916, -50.1668, False),
    Ponto("Joinville", "SC", -26.3044, -48.8487, False),
    Ponto("Blumenau", "SC", -26.9194, -49.0661, False),
    Ponto("Chapecó", "SC", -27.1004, -52.6152, False),
    Ponto("Caxias do Sul", "RS", -29.1678, -51.1794, False),
    Ponto("Pelotas", "RS", -31.7654, -52.3376, False),
    Ponto("Santa Maria", "RS", -29.6842, -53.8069, False),
    Ponto("Passo Fundo", "RS", -28.262, -52.4064, False),
    Ponto("Niterói", "RJ", -22.8832, -43.1034, False),
    Ponto("Campos dos Goytacazes", "RJ", -21.7545, -41.3244, False),
    Ponto("Petrópolis", "RJ", -22.5112, -43.1779, False),
    Ponto("Feira de Santana", "BA", -12.2664, -38.9663, False),
    Ponto("Vitória da Conquista", "BA", -14.8615, -40.8442, False),
    Ponto("Ilhéus", "BA", -14.7936, -39.0463, False),
    Ponto("Barreiras", "BA", -12.1528, -44.99, False),
    Ponto("Porto Seguro", "BA", -16.4435, -39.0643, False),
    Ponto("Juazeiro do Norte", "CE", -7.2131, -39.3151, False),
    Ponto("Sobral", "CE", -3.6861, -40.3497, False),
    Ponto("Campina Grande", "PB", -7.2307, -35.8817, False),
    Ponto("Caruaru", "PE", -8.276, -35.9819, False),
    Ponto("Petrolina", "PE", -9.3891, -40.503, False),
    Ponto("Mossoró", "RN", -5.1878, -37.344, False),
    Ponto("Imperatriz", "MA", -5.5264, -47.4917, False),
    Ponto("Marabá", "PA", -5.3686, -49.1178, False),
    Ponto("Santarém", "PA", -2.4431, -54.7083, False),
    Ponto("Parintins", "AM", -2.6283, -56.7358, False),
    Ponto("Anápolis", "GO", -16.3281, -48.953, False),
    Ponto("Rio Verde", "GO", -17.7923, -50.9192, False),
    Ponto("Dourados", "MS", -22.2231, -54.812, False),
    Ponto("Rondonópolis", "MT", -16.4673, -54.6372, False),
    Ponto("Sinop", "MT", -11.8604, -55.5091, False),
    Ponto("Ji-Paraná", "RO", -10.8853, -61.9517, False),
    Ponto("Araguaína", "TO", -7.1911, -48.2072, False),
)


def listar_capitais() -> list[Ponto]:
    return [cidade for cidade in CIDADES_DO_BRASIL if cidade.capital]


def sortear_cidades(quantidade: int, gerador_aleatorio: random.Random) -> list[Ponto]:
    return gerador_aleatorio.sample(CIDADES_DO_BRASIL, quantidade)
