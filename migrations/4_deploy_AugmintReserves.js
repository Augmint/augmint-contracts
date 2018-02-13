const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = async function(deployer) {
    await deployer.deploy(AugmintReserves);
};
