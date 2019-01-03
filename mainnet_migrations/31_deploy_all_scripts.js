const Migrations = artifacts.require("./Migrations.sol");
const Main0014_initNewContracts = artifacts.require("./Main0014_initNewContracts.sol");
const Main0015_migrateLegacyContracts = artifacts.require("./Main0015_migrateLegacyContracts.sol");
const Main0016_setupLegacy = artifacts.require("./Main0016_setupLegacy.sol");
const Main0017_postDeploySetup = artifacts.require("./Main0017_postDeploySetup.sol");
const Main0018_preTokenSigners = artifacts.require("./Main0018_preTokenSigners.sol");

const MIGRATION_STEP_NUMBER = 31;
const MIGRATIONS_ADDRESS = "0xf01C976E9189BC9ba68Eda0f1Dc9d94b243C78dC";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for init new contracts
        await deployer.deploy(Main0014_initNewContracts);

        // script for migrate legacy contracts (to be run via old proxy!)
        await deployer.deploy(Main0015_migrateLegacyContracts);

        // script for setup legacy contract dependencies
        await deployer.deploy(Main0016_setupLegacy);

        // script for post deploy setup
        await deployer.deploy(Main0017_postDeploySetup);

        // script for pretoken signers
        await deployer.deploy(Main0018_preTokenSigners);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
