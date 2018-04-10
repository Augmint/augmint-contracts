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
            locker.addLockProduct(160000, 31536000, 1000, true), // 365 days, 16% p.a.
            locker.addLockProduct(66750, 15552000, 1000, true), // 180 days, 14% p.a.
            locker.addLockProduct(23779, 7776000, 1000, true), // 90 days 10% p.a.
            locker.addLockProduct(6346, 2592000, 1000, true), // 30 days, 8% p.a.
            locker.addLockProduct(2237, 1209600, 1000, true), // 14 days, 6% p.a.
            locker.addLockProduct(936, 604800, 1000, true), // 7 days, 5% p.a.
            locker.addLockProduct(251, 3600, 1000, true), // 60 minutes for testing, ~801.13% p.a.
            locker.addLockProduct(1, 60, 1000, true) // 1 minute for testing, ~69.15% p.a.
        ]);
    });
};
