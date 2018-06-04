const Locker = artifacts.require("./Locker.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = function(deployer, network, accounts) {
    deployer.deploy(Locker, accounts[0], TokenAEur.address, MonetarySupervisor.address);
};
