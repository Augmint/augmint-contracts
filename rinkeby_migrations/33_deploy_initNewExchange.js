/* Init newly deployed Exchange */
const Migrations = artifacts.require("./Migrations.sol");
const Rink0012_initNewExchange = artifacts.require("./Rink0012_initNewExchange.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0012_initNewExchange);

        console.log(" Done with migration step 33. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(33);
    });
};
