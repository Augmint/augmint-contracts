const Migrations = artifacts.require("./Migrations.sol");
const Main0021_changeAllowedDifferenceAmount = artifacts.require("./Main0021_changeAllowedDifferenceAmount.sol");

const MIGRATION_STEP_NUMBER = 33;
const MIGRATIONS_ADDRESS = "0xf01C976E9189BC9ba68Eda0f1Dc9d94b243C78dC";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script to change allowedDifferenceAmount
        await deployer.deploy(Main0021_changeAllowedDifferenceAmount);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
