// Format uniforme pour toutes les réponses JSON de l'API

const succes = (res, data = null, message = 'Succès', statusCode = 200) => {
  return res.status(statusCode).json({
    succes: true,
    message,
    data,
  });
};

const erreur = (res, message = 'Une erreur est survenue', statusCode = 500, details = null) => {
  const corps = { succes: false, message };
  if (details && process.env.NODE_ENV === 'development') {
    corps.details = details;
  }
  return res.status(statusCode).json(corps);
};

const pagine = (res, data, pagination) => {
  return res.status(200).json({
    succes: true,
    data,
    pagination: {
      page: pagination.page,
      limite: pagination.limite,
      total: pagination.total,
      pages: Math.ceil(pagination.total / pagination.limite),
    },
  });
};

module.exports = { succes, erreur, pagine };
