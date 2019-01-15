const Migrations = artifacts.require("./Migrations.sol");
const Main0022_migrateTokensAndEth = artifacts.require("./Main0022_migrateTokensAndEth.sol");

const MIGRATION_STEP_NUMBER = 34;
const MIGRATIONS_ADDRESS = "0xf01C976E9189BC9ba68Eda0f1Dc9d94b243C78dC";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script to migrate eth and tokens from old reserve and system accounts
        await deployer.deploy(Main0022_migrateTokensAndEth);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
