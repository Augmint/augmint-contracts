const Main0027 = artifacts.require("./Main0027_migrate.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Main0027);
    });
};