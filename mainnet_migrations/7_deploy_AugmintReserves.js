const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(AugmintReserves, accounts[0]);
};
