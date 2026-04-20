'use strict';

const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/rendezVousController');
const { authentifier } = require('../middlewares/authenticate');
const { tousLesRoles } = require('../middlewares/authorize');
const { asyncHandler } = require('../middlewares/errorHandler');

router.use(authentifier);

router.get('/', tousLesRoles, asyncHandler(ctrl.lister));
router.post('/', tousLesRoles, asyncHandler(ctrl.creer));
router.get('/:id', tousLesRoles, asyncHandler(ctrl.obtenir));
router.put('/:id', tousLesRoles, asyncHandler(ctrl.modifier));
router.delete('/:id', tousLesRoles, asyncHandler(ctrl.supprimer));

module.exports = router;
