/* This migration step was ran but Rink0007_initNewExchange script failed to execute  */
const Migrations = artifacts.require("./Migrations.sol");
const Rink0007_initNewExchange = artifacts.require("./Rink0007_initNewExchange.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0007_initNewExchange);

        console.log(" Done with migration step 27. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(27);
    });
};
