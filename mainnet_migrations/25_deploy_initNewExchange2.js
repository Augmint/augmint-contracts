const Migrations = artifacts.require("./Migrations.sol");
const Main0010_initNewExchange2 = artifacts.require("./Main0010_initNewExchange2.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0010_initNewExchange2);

        console.log(" Done with migration step 25. Updating truffle Migrations step manually");
        await Migrations.at("0xE7E9f87805C0BEC5108963D07f85e4cA5892D421").setCompleted(25);
    });
};
