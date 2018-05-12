/* switch over to new MonetSupervisor version in legacy contracts */
const Migrations = artifacts.require("./Migrations.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const Locker = artifacts.require("./Locker.sol");
const LoanManager = artifacts.require("./LoanManager.sol");

module.exports = function(deployer, network, accounts) {
    const ratesAddress = "0xcA8100FCcb479516A5b30f8Bc5dAeA09Fb7a7473";
    const feeAccount = FeeAccount.at("0xc26667132b0B798ab87864f7c29c0819c887aADB");
    const augmintReserves = AugmintReserves.at("0xc70b65e40f877cdC6d8D2ebFd44d63EfBeb7fc6D");
    const interestEarnedAccount = InterestEarnedAccount.at("0x3a414d7636defb9d3dfb7342984fe3f7b5125df6");
    const oldMonetarySupervisor = MonetarySupervisor.at("0xa00a5d1882C3F690E3d0D975ebE378120b70ae87");
    const newMonetarySupervisor = MonetarySupervisor.at("0xC19a45F5CbfA93Be512ef07177feB3f7b3ae4518");

    const oldToken3 = TokenAEur.at("0x135893F1A6B3037BB45182841f18F69327366992");

    const oldLocker1 = Locker.at("0xf98AE1fb568B267A7632BF54579A153C892E2ec2");
    const oldLoanManager1 = LoanManager.at("0xBdb02f82d7Ad574f9F549895caf41E23a8981b07");

    deployer.then(async () => {
        console.log(" switching new MS to live");
        await Promise.all([
            oldLocker1.setMonetarySupervisor(newMonetarySupervisor.address),
            oldLoanManager1.setSystemContracts(ratesAddress, newMonetarySupervisor.address)
        ]);

        // 3. migrate totals from previous MS (using MS.adjustKPIs)
        const [oldTotalLoan, oldTotalLock] = await Promise.all([
            oldMonetarySupervisor.totalLoanAmount(),
            oldMonetarySupervisor.totalLockedAmount()
        ]);
        console.log(
            "Migrating KPIs to new MonetarySupervisor contract. totalLoanAmount:",
            oldTotalLoan.toString(),
            "totalLockedAmount",
            oldTotalLock.toString()
        );
        await newMonetarySupervisor.adjustKPIs(oldTotalLoan, oldTotalLock);

        console.log("Revoking permission from old MS");
        await Promise.all([
            feeAccount.revokePermission(oldMonetarySupervisor.address, "NoFeeTransferContracts"),
            interestEarnedAccount.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),
            oldToken3.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),
            augmintReserves.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),

            oldMonetarySupervisor.revokePermission(oldLocker1.address, "LockerContracts"),
            oldMonetarySupervisor.revokePermission(oldLoanManager1.address, "LoanManagerContracts")
        ]);

        console.log(" Done with all migration steps. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(18);
    });
};
