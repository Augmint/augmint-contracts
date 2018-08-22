const Migrations = artifacts.require("./Migrations.sol");
const Rink0008_initNewExchange2 = artifacts.require("./Rink0008_initNewExchange2.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0008_initNewExchange2);

        console.log(" Done with migration step 28. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(28);
    });
};
