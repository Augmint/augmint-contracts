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
            locker.addLockProduct(140000, 31536000, 1000, true), // 365 days, 14% pa.
            locker.addLockProduct(60000, 15552000, 1000, true), // 180 days, ~12% pa.
            locker.addLockProduct(27500, 7776000, 1000, true), // 90 days ~11% pa.
            locker.addLockProduct(8330, 2592000, 1000, true), // 30 days, ~10% pa.
            locker.addLockProduct(3068, 2592000, 1000, true), // 14 days, ~8% pa.
            locker.addLockProduct(959, 2592000, 1000, true), // 7 days, ~5% pa.
            locker.addLockProduct(1, 60, 1000, true) // 1 minute for testing
        ]);
    });
};
