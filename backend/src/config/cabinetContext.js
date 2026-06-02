'use strict';

const { AsyncLocalStorage } = require('async_hooks');

const storage = new AsyncLocalStorage();

const getCabinetId = () => storage.getStore()?.cabinetId ?? null;

const runWithCabinet = (cabinetId, fn) => storage.run({ cabinetId }, fn);

module.exports = { getCabinetId, runWithCabinet };
