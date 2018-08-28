const Migrations = artifacts.require("./Migrations.sol");
const Rink0010_changeDefaultingFee = artifacts.require("./Rink0010_changeDefaultingFee.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rink0010_changeDefaultingFee);

        console.log(" Done with migration step 30. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(30);
    });
};
