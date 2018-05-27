const Locker = artifacts.require("./Locker.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = function(deployer) {
    deployer.deploy(Locker, TokenAEur.address, MonetarySupervisor.address);
};
