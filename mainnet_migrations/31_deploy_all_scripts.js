const Migrations = artifacts.require("./Migrations.sol");
const Main0014_initNewContracts = artifacts.require("./Main0014_initNewContracts.sol");
const Main0015_migrateLegacyContracts = artifacts.require("./Main0015_migrateLegacyContracts.sol");
const Main0016_setupLegacy = artifacts.require("./Main0016_setupLegacy.sol");
const Main0017_setupSigners = artifacts.require("./Main0017_setupSigners.sol");
const Main0018_postDeploySetup = artifacts.require("./Main0018_postDeploySetup.sol");

const MIGRATION_STEP_NUMBER = 31;
const MIGRATIONS_ADDRESS = "???";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for init new contracts
        await deployer.deploy(Main0014_initNewContracts);

        // script for migrate legacy contracts (to be run via old proxy!)
        await deployer.deploy(Main0015_migrateLegacyContracts);

        // script for setup legacy contract dependencies
        await deployer.deploy(Main0016_setupLegacy);

        // script for setup StabilityBoard signers
        await deployer.deploy(Main0017_setupSigners);

        // script for post deploy setup
        await deployer.deploy(Main0018_postDeploySetup);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
