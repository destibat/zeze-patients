import api from './api';

const lister = async (params = {}) => {
  const { data } = await api.get('/patients', { params });
  return data;
};

const obtenir = async (id) => {
  const { data } = await api.get(`/patients/${id}`);
  return data.data;
};

const creer = async (payload) => {
  const { data } = await api.post('/patients', payload);
  return data.data;
};

const modifier = async (id, payload) => {
  const { data } = await api.put(`/patients/${id}`, payload);
  return data.data;
};

const archiver = async (id) => {
  const { data } = await api.delete(`/patients/${id}`);
  return data;
};

const uploadPhoto = async (id, fichier) => {
  const formData = new FormData();
  formData.append('photo', fichier);
  const { data } = await api.post(`/patients/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data.data;
};

export default { lister, obtenir, creer, modifier, archiver, uploadPhoto };
