const Locker = artifacts.require("./Locker.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");

module.exports = function(deployer) {
    deployer.deploy(Locker, TokenAEur.address, MonetarySupervisor.address);
    deployer.then(async () => {
        const locker = Locker.at(Locker.address);
        await Promise.all([
            // (perTermInterest,  durationInSecs, minimumLockAmount, isActive)
            locker.addLockProduct(80001, 31536000, 1000, true), // 365 days, 8% p.a.
            locker.addLockProduct(33929, 15552000, 1000, true), // 180 days, 7% p.a.

            locker.addLockProduct(14472, 7776000, 1000, true), // 90 days 6% p.a.
            locker.addLockProduct(4019, 2592000, 1000, true), // 30 days, 5% p.a.
            locker.addLockProduct(1506, 1209600, 1000, true), // 14 days, 4% p.a.
            locker.addLockProduct(568, 604800, 1000, true), // 7 days, 3% p.a.

            locker.addLockProduct(3, 3600, 2000, true), // 60 minutes for testing, ~2.66% p.a.
            locker.addLockProduct(1, 60, 3000, true) // 1 minute for testing, ~69.15% p.a.
        ]);
    });
};
