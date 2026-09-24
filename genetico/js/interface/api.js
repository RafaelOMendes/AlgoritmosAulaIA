export async function chamarApi(rota, dados = {}) {
  let resposta;
  try {
    resposta = await fetch(rota, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
  } catch {
    throw new Error('Não foi possível falar com o servidor Python. Ele está rodando (python servidor.py)?');
  }
  const conteudo = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    throw new Error(conteudo.erro ?? `O servidor respondeu com erro ${resposta.status}.`);
  }
  return conteudo;
}
