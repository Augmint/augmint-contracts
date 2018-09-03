const Migrations = artifacts.require("./Migrations.sol");
const Rink0009_changeSBSigners = artifacts.require("./Rink0009_changeSBSigners.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0009_changeSBSigners);

        console.log(" Done with migration step 29. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(29);
    });
};
