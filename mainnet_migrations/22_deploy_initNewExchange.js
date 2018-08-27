/* the script deployed here failed to execute becuase  exchange was  deployed with incorrect
   constructor args in previous step */
const Migrations = artifacts.require("./Migrations.sol");
const Main0008_initNewExchange = artifacts.require("./Main0008_initNewExchange.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0008_initNewExchange);

        console.log(" Done with migration step 22. Updating truffle Migrations step manually");
        await Migrations.at("0xE7E9f87805C0BEC5108963D07f85e4cA5892D421").setCompleted(22);
    });
};
