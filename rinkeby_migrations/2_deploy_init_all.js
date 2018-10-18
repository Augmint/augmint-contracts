const Migrations = artifacts.require("./Migrations.sol");
const Rinkeby_0001_initAll = artifacts.require("./Rinkeby_0001_initAll.sol");

const MIGRATION_STEP_NUMBER = 2;
const MIGRATIONS_ADDRESS = "0xc9a7258b2b1ea36ce735793e4816ad949532c9fd";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script for init new contracts
        await deployer.deploy(Rinkeby_0001_initAll);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};