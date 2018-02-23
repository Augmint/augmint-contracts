const Locker = artifacts.require("./Locker.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const SafeMath = artifacts.require("./SafeMath.sol");

module.exports = function(deployer) {
    deployer.link(SafeMath, Locker);
    deployer.deploy(Locker, TokenAEur.address, MonetarySupervisor.address);
    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const locker = Locker.at(Locker.address);
        await Promise.all([
            tokenAEur.grantPermission(Locker.address, "NoFeeTransferContracts"),
            monetarySupervisor.grantPermission(Locker.address, "LockerContracts"),
            // (perTermInterest,  durationInSecs, minimumLockAmount, isActive)
            locker.addLockProduct(50000, 60, 1000, true) // to be used in tests to make unit test independent
        ]);
    });
};
