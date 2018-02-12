const Locker = artifacts.require("./Locker.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, Locker);
    deployer.deploy(Locker, TokenAEur.address, MonetarySupervisor.address);
    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        await tokenAEur.grantMultiplePermissions(Locker.address, ["NoFeeTransferContracts"]);
        const monetarySupervisor = await MonetarySupervisor.at(MonetarySupervisor.address);
        await monetarySupervisor.grantMultiplePermissions(Locker.address, ["LockerContracts"]);
    });
};
