import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const superadminApi = (token) =>
  axios.create({
    baseURL: API_URL,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    timeout: 15000,
  });

export const loginSuperAdmin = async (secret) => {
  const { data } = await axios.post(`${API_URL}/superadmin/auth`, { secret });
  return data.token;
};

export const getAbonnement = async (token) => {
  const { data } = await superadminApi(token).get('/superadmin/abonnement');
  return data;
};

export const updateAbonnement = async (token, payload) => {
  const { data } = await superadminApi(token).put('/superadmin/abonnement', payload);
  return data;
};
