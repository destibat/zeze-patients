import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({
  baseURL: API_URL,
  headers: { 'Content-Type': 'application/json' },
  timeout: 15000,
});

// Injecte le token JWT dans chaque requête
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('accessToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Gère le renouvellement automatique du token expiré
let enCoursDuRenouvellement = false;
let fileAttente = [];

const traiterFileAttente = (erreur, token = null) => {
  fileAttente.forEach(({ resolve, reject }) => {
    if (erreur) reject(erreur);
    else resolve(token);
  });
  fileAttente = [];
};

api.interceptors.response.use(
  (response) => response,
  async (erreur) => {
    const requeteOriginale = erreur.config;

    if (erreur.response?.status !== 401 || requeteOriginale._retente) {
      return Promise.reject(erreur);
    }

    if (enCoursDuRenouvellement) {
      return new Promise((resolve, reject) => {
        fileAttente.push({ resolve, reject });
      }).then((token) => {
        requeteOriginale.headers.Authorization = `Bearer ${token}`;
        return api(requeteOriginale);
      });
    }

    requeteOriginale._retente = true;
    enCoursDuRenouvellement = true;

    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) throw new Error('Pas de refresh token');

      const { data } = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
      const nouveauToken = data.data.accessToken;

      localStorage.setItem('accessToken', nouveauToken);
      localStorage.setItem('refreshToken', data.data.refreshToken);

      api.defaults.headers.common.Authorization = `Bearer ${nouveauToken}`;
      traiterFileAttente(null, nouveauToken);

      requeteOriginale.headers.Authorization = `Bearer ${nouveauToken}`;
      return api(requeteOriginale);
    } catch (erreurRenouv) {
      traiterFileAttente(erreurRenouv, null);
      localStorage.removeItem('accessToken');
      localStorage.removeItem('refreshToken');
      window.location.href = '/connexion';
      return Promise.reject(erreurRenouv);
    } finally {
      enCoursDuRenouvellement = false;
    }
  }
);

export default api;
