const CENTRO_DO_BRASIL = [-14.5, -52];
const ZOOM_INICIAL = 4;
const ENDERECO_DAS_IMAGENS_DO_MAPA = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const CREDITOS_DO_MAPA = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

function lerCor(nomeDaVariavel) {
  return getComputedStyle(document.documentElement).getPropertyValue(nomeDaVariavel).trim();
}

function criarIconeDoPonto(numero) {
  return L.divIcon({
    className: '',
    html: `<div class="marcador-ponto">${numero}</div>`,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });
}

function descreverPonto(ponto) {
  return ponto.uf ? `${ponto.nome} (${ponto.uf})` : ponto.nome;
}

export function criarMapaDaRota(elemento, { aoClicarNoMapa, aoClicarNoPonto }) {
  if (typeof L === 'undefined') {
    return { mostrarPontos() {}, mostrarRota() {}, enquadrarPontos() {}, ajustarTamanho() {} };
  }

  const mapa = L.map(elemento, { zoomControl: true, worldCopyJump: true }).setView(CENTRO_DO_BRASIL, ZOOM_INICIAL);
  L.tileLayer(ENDERECO_DAS_IMAGENS_DO_MAPA, { attribution: CREDITOS_DO_MAPA, maxZoom: 19 }).addTo(mapa);

  const camadaDosPontos = L.layerGroup().addTo(mapa);
  const linhaDaRota = L.polyline([], {
    color: lerCor('--destaque'),
    weight: 3,
    opacity: 0.95,
    className: 'rota-melhor',
  }).addTo(mapa);

  mapa.on('click', (evento) => aoClicarNoMapa(evento.latlng.lat, evento.latlng.lng));

  function mostrarPontos(pontos) {
    camadaDosPontos.clearLayers();
    pontos.forEach((ponto, indice) => {
      const marcador = L.marker([ponto.latitude, ponto.longitude], { icon: criarIconeDoPonto(indice + 1) });
      marcador.bindTooltip(`${indice + 1}. ${descreverPonto(ponto)}<br><small>clique para remover</small>`, {
        direction: 'top',
        offset: [0, -10],
      });
      marcador.on('click', (evento) => {
        L.DomEvent.stopPropagation(evento);
        aoClicarNoPonto(indice);
      });
      camadaDosPontos.addLayer(marcador);
    });
    if (pontos.length === 0) {
      linhaDaRota.setLatLngs([]);
    }
  }

  function mostrarRota(pontos, rota) {
    if (!rota || rota.length === 0) {
      linhaDaRota.setLatLngs([]);
      return;
    }
    const coordenadas = [...rota, rota[0]].map((indice) => [pontos[indice].latitude, pontos[indice].longitude]);
    linhaDaRota.setLatLngs(coordenadas);
  }

  function enquadrarPontos(pontos) {
    if (pontos.length === 0) {
      mapa.setView(CENTRO_DO_BRASIL, ZOOM_INICIAL);
      return;
    }
    const limites = L.latLngBounds(pontos.map((ponto) => [ponto.latitude, ponto.longitude]));
    mapa.fitBounds(limites, { padding: [40, 40], maxZoom: 10 });
  }

  function ajustarTamanho() {
    mapa.invalidateSize();
  }

  return { mostrarPontos, mostrarRota, enquadrarPontos, ajustarTamanho };
}
