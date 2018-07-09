const Migrations = artifacts.require("./Migrations.sol");
const Rink0006_fixInitNewLocker = artifacts.require("./Rink0006_fixInitNewLocker.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0006_fixInitNewLocker);

        console.log(" Done with migration step 25. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(25);
    });
};
