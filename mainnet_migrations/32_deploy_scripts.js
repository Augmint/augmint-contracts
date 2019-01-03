const Migrations = artifacts.require("./Migrations.sol");
const Main0019_noTransferFee = artifacts.require("./Main0019_noTransferFee.sol");
const Main0020_removeSigner = artifacts.require("./Main0020_removeSigner.sol");

const MIGRATION_STEP_NUMBER = 32;
const MIGRATIONS_ADDRESS = "0xf01C976E9189BC9ba68Eda0f1Dc9d94b243C78dC";

module.exports = function(deployer) {
    deployer.then(async () => {

        // script to eliminate transfer fees
        await deployer.deploy(Main0019_noTransferFee);

        // script to remove deployer account from signers
        await deployer.deploy(Main0020_removeSigner);

        console.log("Done with migration step " + MIGRATION_STEP_NUMBER);
        await Migrations.at(MIGRATIONS_ADDRESS).setCompleted(MIGRATION_STEP_NUMBER);
    });
};
