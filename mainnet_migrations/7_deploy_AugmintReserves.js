const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        await deployer.deploy(AugmintReserves, accounts[0]);
    });
};
