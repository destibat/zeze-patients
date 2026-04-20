import api from './api';

const lister = async (params = {}) => {
  const { data } = await api.get('/users', { params });
  return data;
};

const obtenir = async (id) => {
  const { data } = await api.get(`/users/${id}`);
  return data.data;
};

const creer = async (payload) => {
  const { data } = await api.post('/users', payload);
  return data.data;
};

const modifier = async (id, payload) => {
  const { data } = await api.put(`/users/${id}`, payload);
  return data.data;
};

const reinitialiserMdp = async (id, nouveauMotDePasse) => {
  const { data } = await api.put(`/users/${id}/reinitialiser-mdp`, { nouveauMotDePasse });
  return data;
};

const desactiver = async (id) => {
  const { data } = await api.delete(`/users/${id}`);
  return data;
};

export default { lister, obtenir, creer, modifier, reinitialiserMdp, desactiver };
