const Migrations = artifacts.require("./Migrations.sol");
const Rinkeby_0002_redeployInitAll = artifacts.require("./Rinkeby_0002_redeployInitAll.sol");
const Rinkeby_0003_migrateLegacy = artifacts.require("./Rinkeby_0003_migrateLegacy.sol");
const Rinkeby_0004_setupLegacy = artifacts.require("./Rinkeby_0004_setupLegacy.sol");
const Rinkeby_0005_setupSigners = artifacts.require("./Rinkeby_0005_setupSigners.sol");
const Rinkeby_0006_postDeploySetup = artifacts.require("./Rinkeby_0006_postDeploySetup.sol");

const MIGRATION_STEP_NUMBER = 4;
const MIGRATIONS_ADDRESS = "0xc9a7258b2b1ea36ce735793e4816ad949532c9fd";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for init new contracts
        await deployer.deploy(Rinkeby_0002_redeployInitAll);

        // script for migrate legacy contracts (to be run via old proxy!)
        await deployer.deploy(Rinkeby_0003_migrateLegacy);

        // script for setup legacy contract dependencies
        await deployer.deploy(Rinkeby_0004_setupLegacy);

        // script for setup StabilityBoard signers
        await deployer.deploy(Rinkeby_0005_setupSigners);

        // script for post deploy setup
        await deployer.deploy(Rinkeby_0006_postDeploySetup);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};