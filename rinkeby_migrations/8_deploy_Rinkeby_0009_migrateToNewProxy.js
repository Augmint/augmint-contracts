const Rinkeby_0009_migrateToNewProxy = artifacts.require("./Rinkeby_0009_migrateToNewProxy.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        await deployer.deploy(Rinkeby_0009_migrateToNewProxy);
    });
};