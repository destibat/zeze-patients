import api from './api';

const connexion = async (email, motDePasse) => {
  const { data } = await api.post('/auth/login', { email, password: motDePasse });
  return data.data;
};

const deconnexion = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  try {
    await api.post('/auth/logout', { refreshToken });
  } finally {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  }
};

const obtenirProfil = async () => {
  const { data } = await api.get('/auth/me');
  return data.data;
};

const changerMotDePasse = async (ancienMdp, nouveauMdp) => {
  const { data } = await api.put('/auth/changer-mdp', {
    ancienMotDePasse: ancienMdp,
    nouveauMotDePasse: nouveauMdp,
  });
  return data;
};

const sauvegarderTokens = (accessToken, refreshToken) => {
  localStorage.setItem('accessToken', accessToken);
  localStorage.setItem('refreshToken', refreshToken);
};

export default { connexion, deconnexion, obtenirProfil, changerMotDePasse, sauvegarderTokens };
