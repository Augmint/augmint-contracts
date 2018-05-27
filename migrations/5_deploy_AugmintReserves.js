const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = function(deployer) {
    deployer.deploy(AugmintReserves);
};
