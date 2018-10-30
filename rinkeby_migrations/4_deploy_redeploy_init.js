const Migrations = artifacts.require("./Migrations.sol");
const Rinkeby_0002_redeployInitAll = artifacts.require("./Rinkeby_0002_redeployInitAll.sol");
const Rinkeby_0003_migrateLegacy = artifacts.require("./Rinkeby_0003_migrateLegacy.sol");

const MIGRATION_STEP_NUMBER = 4;
const MIGRATIONS_ADDRESS = "0xc9a7258b2b1ea36ce735793e4816ad949532c9fd";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for init new contracts
        await deployer.deploy(Rinkeby_0002_redeployInitAll);

        // script for migrate legacy contracts
        await deployer.deploy(Rinkeby_0003_migrateLegacy);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};