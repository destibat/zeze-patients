'use strict';

const NOUVEAUX_MODES = "ENUM('especes','orange_money','momo_mtn','wave','moov','western_union','moneygram','ria','virement','cheque','mobile_money','autre')";

module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE factures MODIFY COLUMN mode_paiement ${NOUVEAUX_MODES} NULL`
    );
  },
  async down(queryInterface) {
    await queryInterface.sequelize.query(
      `ALTER TABLE factures MODIFY COLUMN mode_paiement ENUM('especes','mobile_money','virement','cheque','autre') NULL`
    );
  },
};
