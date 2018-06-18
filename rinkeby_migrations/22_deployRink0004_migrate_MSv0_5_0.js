/******************************************************************************
 * Deploys StabilityBoard script to migrate KPIs from old MonetarySupervisor
 ******************************************************************************/
const Migrations = artifacts.require("./Migrations.sol");
const Rink0004_migrate_MSv0_5_0 = artifacts.require("./Rink0004_migrate_MSv0_5_0.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0004_migrate_MSv0_5_0);

        console.log(" Done with migration step 22. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(22);
    });
};
