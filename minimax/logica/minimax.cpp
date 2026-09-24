#include <iostream>
#include <vector>
#include <queue>
#include <algorithm>
#include <limits>
#include <future>
#include <chrono>

using namespace std;

const uint8_t LIVRE = 0;
const uint8_t PAREDE = 1;
const uint8_t RASTRO_AZUL = 2;
const uint8_t RASTRO_LARANJA = 3;

const int FORA = -1;

const int CIMA = 0;
const int DIREITA = 1;
const int BAIXO = 2;
const int ESQUERDA = 3;

const int DELTA_L[4] = {-1, 0, 1, 0};
const int DELTA_C[4] = {0, 1, 0, -1};

const int VALOR_VITORIA = 1000;
const int VALOR_EMPATE = -500;
const int INF = numeric_limits<int>::max();

struct Estado {
    int tamanho;
    vector<uint8_t> celulas;
    int pos_azul;
    int pos_laranja;
    bool vivo_azul;
    bool vivo_laranja;
};

struct Reversao {
    int pos_azul;
    int pos_laranja;
    bool vivo_azul;
    bool vivo_laranja;
    int mod_azul;
    int mod_laranja;
};

struct Contexto {
    bool max_eh_azul;
    bool poda;
    int nos_visitados;
    int ramos_podados;
};

// Tabelas globais para performance
vector<vector<int>> vizinhos;
vector<vector<int>> vizinhos_validos;

void inicializar_tabelas(int tamanho) {
    if (!vizinhos.empty() && vizinhos.size() == (size_t)(tamanho * tamanho)) return;
    vizinhos.assign(tamanho * tamanho, vector<int>(4, FORA));
    vizinhos_validos.assign(tamanho * tamanho, vector<int>());
    
    for (int l = 0; l < tamanho; ++l) {
        for (int c = 0; c < tamanho; ++c) {
            int idx = l * tamanho + c;
            for (int d = 0; d < 4; ++d) {
                int nl = l + DELTA_L[d];
                int nc = c + DELTA_C[d];
                if (nl >= 0 && nl < tamanho && nc >= 0 && nc < tamanho) {
                    int viz = nl * tamanho + nc;
                    vizinhos[idx][d] = viz;
                    vizinhos_validos[idx].push_back(viz);
                }
            }
        }
    }
}

inline bool celula_livre(const Estado& e, int idx) {
    return idx != FORA && e.celulas[idx] == LIVRE;
}

vector<int> movimentos_possiveis(const Estado& e, bool azul) {
    int pos = azul ? e.pos_azul : e.pos_laranja;
    vector<int> movs;
    for (int d = 0; d < 4; ++d) {
        int viz = vizinhos[pos][d];
        if (celula_livre(e, viz)) movs.push_back(d);
    }
    if (movs.empty()) movs.push_back(0); // Último movimento (fallback simplificado)
    return movs;
}

Reversao fazer_rodada(Estado& e, int mov_azul, int mov_laranja) {
    Reversao rev = {e.pos_azul, e.pos_laranja, e.vivo_azul, e.vivo_laranja, FORA, FORA};
    
    int dest_azul = vizinhos[e.pos_azul][mov_azul];
    int dest_laranja = vizinhos[e.pos_laranja][mov_laranja];
    bool colisao_frontal = (dest_azul == dest_laranja);
    
    bool azul_sobrevive = celula_livre(e, dest_azul) && !colisao_frontal;
    bool laranja_sobrevive = celula_livre(e, dest_laranja) && !colisao_frontal;
    
    if (azul_sobrevive) {
        e.celulas[dest_azul] = RASTRO_AZUL;
        e.pos_azul = dest_azul;
        rev.mod_azul = dest_azul;
    } else {
        e.vivo_azul = false;
    }
    
    if (laranja_sobrevive) {
        e.celulas[dest_laranja] = RASTRO_LARANJA;
        e.pos_laranja = dest_laranja;
        rev.mod_laranja = dest_laranja;
    } else {
        e.vivo_laranja = false;
    }
    return rev;
}

void desfazer_rodada(Estado& e, const Reversao& rev) {
    if (rev.mod_azul != FORA) e.celulas[rev.mod_azul] = LIVRE;
    if (rev.mod_laranja != FORA) e.celulas[rev.mod_laranja] = LIVRE;
    e.pos_azul = rev.pos_azul;
    e.pos_laranja = rev.pos_laranja;
    e.vivo_azul = rev.vivo_azul;
    e.vivo_laranja = rev.vivo_laranja;
}

int calcular_territorios(const Estado& e, bool max_eh_azul) {
    int n = e.tamanho * e.tamanho;
    vector<uint8_t> dono(n, LIVRE);
    vector<int> camada_alcance(n, FORA);
    
    vector<int> front_azul = {e.pos_azul};
    vector<int> front_laranja = {e.pos_laranja};
    int camada = 0;
    
    while (!front_azul.empty() || !front_laranja.empty()) {
        camada++;
        vector<int> prox_azul;
        for (int c : front_azul) {
            for (int v : vizinhos_validos[c]) {
                if (e.celulas[v] == LIVRE && dono[v] == LIVRE) {
                    dono[v] = 1; // 1 = Azul
                    camada_alcance[v] = camada;
                    prox_azul.push_back(v);
                }
            }
        }
        
        vector<int> prox_laranja;
        for (int c : front_laranja) {
            for (int v : vizinhos_validos[c]) {
                if (e.celulas[v] != LIVRE) continue;
                if (dono[v] == LIVRE) {
                    dono[v] = 2; // 2 = Laranja
                    camada_alcance[v] = camada;
                    prox_laranja.push_back(v);
                } else if (dono[v] == 1 && camada_alcance[v] == camada) {
                    dono[v] = 3; // 3 = Disputada
                    prox_laranja.push_back(v);
                }
            }
        }
        front_azul = move(prox_azul);
        front_laranja = move(prox_laranja);
    }
    
    int t_azul = 0, t_laranja = 0;
    for (int i = 0; i < n; ++i) {
        if (dono[i] == 1) t_azul++;
        else if (dono[i] == 2) t_laranja++;
    }
    return max_eh_azul ? (t_azul - t_laranja) : (t_laranja - t_azul);
}

int avaliar_fim(const Estado& e, bool max_eh_azul, int rodadas) {
    bool max_vivo = max_eh_azul ? e.vivo_azul : e.vivo_laranja;
    bool min_vivo = max_eh_azul ? e.vivo_laranja : e.vivo_azul;
    
    if (max_vivo && !min_vivo) return VALOR_VITORIA + rodadas;
    if (!max_vivo && min_vivo) return -VALOR_VITORIA - rodadas;
    return VALOR_EMPATE;
}

int valor_no_maximizador(Contexto& ctx, Estado& e, int rodadas, int alfa, int beta);
int valor_no_minimizador(Contexto& ctx, Estado& e, int mov_max, int rodadas, int alfa, int beta);

int valor_no_minimizador(Contexto& ctx, Estado& e, int mov_max, int rodadas, int alfa, int beta) {
    ctx.nos_visitados++;
    auto movs = movimentos_possiveis(e, !ctx.max_eh_azul);
    int menor_valor = INF;
    
    for (int mov : movs) {
        int m_azul = ctx.max_eh_azul ? mov_max : mov;
        int m_laranja = ctx.max_eh_azul ? mov : mov_max;
        
        Reversao rev = fazer_rodada(e, m_azul, m_laranja);
        int val = valor_no_maximizador(ctx, e, rodadas - 1, alfa, beta);
        desfazer_rodada(e, rev);
        
        menor_valor = min(menor_valor, val);
        if (ctx.poda) {
            beta = min(beta, menor_valor);
            if (alfa >= beta) {
                ctx.ramos_podados++;
                break;
            }
        }
    }
    return menor_valor;
}

int valor_no_maximizador(Contexto& ctx, Estado& e, int rodadas, int alfa, int beta) {
    ctx.nos_visitados++;
    
    if (!e.vivo_azul || !e.vivo_laranja) return avaliar_fim(e, ctx.max_eh_azul, rodadas);
    if (rodadas == 0) return calcular_territorios(e, ctx.max_eh_azul);
    
    auto movs = movimentos_possiveis(e, ctx.max_eh_azul);
    int melhor_valor = -INF;
    
    for (int mov : movs) {
        int val = valor_no_minimizador(ctx, e, mov, rodadas, alfa, beta);
        melhor_valor = max(melhor_valor, val);
        
        if (ctx.poda) {
            alfa = max(alfa, melhor_valor);
            if (alfa >= beta) {
                ctx.ramos_podados++;
                break;
            }
        }
    }
    return melhor_valor;
}

extern "C" {
    void buscar_melhor_movimento_cpp(
        int tamanho, uint8_t* celulas_ptr, 
        int pos_azul, int pos_laranja, 
        bool vivo_azul, bool vivo_laranja, 
        bool max_eh_azul, int profundidade, bool usar_poda,
        int* out_melhor_mov, int* out_valor, int* out_nos, int* out_podas
    ) {
        inicializar_tabelas(tamanho);
        
        Estado e;
        e.tamanho = tamanho;
        e.celulas.assign(celulas_ptr, celulas_ptr + (tamanho * tamanho));
        e.pos_azul = pos_azul;
        e.pos_laranja = pos_laranja;
        e.vivo_azul = vivo_azul;
        e.vivo_laranja = vivo_laranja;
        
        if (!e.vivo_azul || !e.vivo_laranja || profundidade == 0) {
            *out_valor = 0;
            *out_melhor_mov = 0;
            *out_nos = 1;
            *out_podas = 0;
            return;
        }

        auto movs = movimentos_possiveis(e, max_eh_azul);
        int melhor_valor = -INF;
        int melhor_mov = movs[0];
        
        vector<future<pair<int, Contexto>>> futuros;
        
        for (int mov : movs) {
            futuros.push_back(async(launch::async, [e, mov, profundidade, max_eh_azul, usar_poda]() mutable {
                Contexto ctx = {max_eh_azul, usar_poda, 0, 0};
                int val = valor_no_minimizador(ctx, e, mov, profundidade, -INF, INF);
                return make_pair(val, ctx);
            }));
        }
        
        int total_nos = 1;
        int total_podas = 0;
        
        for (size_t i = 0; i < movs.size(); ++i) {
            auto res = futuros[i].get();
            int val = res.first;
            total_nos += res.second.nos_visitados;
            total_podas += res.second.ramos_podados;
            
            if (val > melhor_valor) {
                melhor_valor = val;
                melhor_mov = movs[i];
            }
        }
        
        *out_melhor_mov = melhor_mov;
        *out_valor = melhor_valor;
        *out_nos = total_nos;
        *out_podas = total_podas;
    }
}
