const Migrations = artifacts.require("./Migrations.sol");
const Rink0014_initLegacy = artifacts.require("./Rink0014_initLegacy.sol");
const Rink0015_disableOldProducts = artifacts.require("./Rink0015_disableOldProducts.sol");

const MIGRATION_STEP_NUMBER = 36;
const MIGRATIONS_ADDRESS = "0xfe94ac828c087a167199e0c6f9bcf0a90af2305b";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for legacy contracts
        await deployer.deploy(Rink0014_initLegacy);

        // script for disable old products
        await deployer.deploy(Rink0015_disableOldProducts);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
