/* deploy new TokenAEur version and all dependent contracts:
    - MonetarySupervisor (and switch over to it )
    - Locker
    - LoanManager
    - Exchange
*/
const Migrations = artifacts.require("./Migrations.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const Exchange = artifacts.require("./Exchange.sol");
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

    const oldToken1 = TokenAEur.at("0x95aa79d7410eb60f49bfd570b445836d402bd7b1");
    const oldToken2 = TokenAEur.at("0xa35d9de06895a3a2e7ecae26654b88fe71c179ea");
    const oldToken3 = TokenAEur.at("0x135893F1A6B3037BB45182841f18F69327366992");

    const oldLocker1 = Locker.at("0xf98AE1fb568B267A7632BF54579A153C892E2ec2");
    const oldLoanManager1 = LoanManager.at("0xBdb02f82d7Ad574f9F549895caf41E23a8981b07");

    deployer.deploy(TokenAEur, feeAccount.address);

    deployer.then(async () => {
        /*************************************************************
         * Deploy new TokenAEur
         **************************************************************/

        const newTokenAEur = TokenAEur.at(TokenAEur.address);

        /*************************************************************
         * Deploy new Exchange
         **************************************************************/
        await deployer.deploy(Exchange, newTokenAEur.address, ratesAddress);
        const newExchange = Exchange.at(Exchange.address);

        await feeAccount.grantPermission(newExchange.address, "NoFeeTransferContracts");

        /*************************************************************
         * Deploy new MonetarySupervisor
         **************************************************************/
        await deployer.deploy(
            MonetarySupervisor,
            newTokenAEur.address,
            augmintReserves.address,
            interestEarnedAccount.address,
            200000 /* ltdLockDifferenceLimit */,
            200000 /* ltdLoanDifferenceLimit*/,
            50000 /* allowedLtdDifferenceAmount */
        );

        const newMonetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);

        /*************************************************************
         * Deploy new Locker, setup lock products and permissions
         **************************************************************/
        await deployer.deploy(Locker, TokenAEur.address, MonetarySupervisor.address);
        const newLocker = Locker.at(Locker.address);
        console.log("   Adding test lockProducts.");
        await Promise.all([
            feeAccount.grantPermission(newLocker.address, "NoFeeTransferContracts"),
            newMonetarySupervisor.grantPermission(newLocker.address, "LockerContracts"),

            // (perTermInterest,  durationInSecs, minimumLockAmount, isActive)
            newLocker.addLockProduct(14472, 7776000, 1000, false), // 90 days 6% p.a.
            newLocker.addLockProduct(4019, 2592000, 1000, true), // 30 days, 5% p.a.
            newLocker.addLockProduct(1506, 1209600, 1000, true), // 14 days, 4% p.a.
            newLocker.addLockProduct(568, 604800, 1000, true), // 7 days, 3% p.a.

            newLocker.addLockProduct(3, 3600, 2000, true), // 60 minutes for testing, ~2.66% p.a.
            newLocker.addLockProduct(1, 60, 3000, true) // 1 minute for testing, ~69.15% p.a.
        ]);

        /*************************************************************
         * Deploy new LoanManager, setup loan products and permissions
         **************************************************************/
        await deployer.deploy(LoanManager, newTokenAEur.address, newMonetarySupervisor.address, ratesAddress);
        const newLoanManager = LoanManager.at(LoanManager.address);
        console.log("   Adding test loanProducts.");
        await Promise.all([
            feeAccount.grantPermission(newLoanManager.address, "NoFeeTransferContracts"),
            newMonetarySupervisor.grantPermission(newLoanManager.address, "LoanManagerContracts"),

            // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
            newLoanManager.addLoanProduct(7776000, 971661, 600000, 1000, 50000, false), // 90d, 12%. p.a.
            newLoanManager.addLoanProduct(2592000, 990641, 600000, 1000, 50000, true), // 30d, 12% p.a.
            newLoanManager.addLoanProduct(1209600, 996337, 600000, 1000, 50000, true), // 14d, 10% p.a.
            newLoanManager.addLoanProduct(604800, 998170, 600000, 1000, 50000, true), // 7d, 10% p.a.

            newLoanManager.addLoanProduct(3600, 999989, 980000, 2000, 50000, true), // due in 1hr for testing repayments ? p.a.
            newLoanManager.addLoanProduct(1, 999999, 990000, 3000, 50000, true) // defaults in 1 secs for testing ? p.a.
        ]);

        /*************************************************************
         * Grant MonetaryBoard permissions to accounts on new contracts
         **************************************************************/
        console.log(" Granting MonetaryBoard permissions on new contracts ");
        const monetaryBoardAccounts = [
            accounts[0],
            "0x14A9dc091053fCbA9474c5734078238ff9904364" /* Krosza */,
            "0xe71E9636e31B838aF0A3c38B3f3449cdC2b7aa87" /* Phraktle */
        ];
        const grantMonetaryBoardTxs = monetaryBoardAccounts.map(acc => [
            newExchange.grantPermission(acc, "MonetaryBoard"),
            newLocker.grantPermission(acc, "MonetaryBoard"),
            newTokenAEur.grantPermission(acc, "MonetaryBoard"),
            newLoanManager.grantPermission(acc, "MonetaryBoard"),
            newMonetarySupervisor.grantPermission(acc, "MonetaryBoard")
        ]);
        Promise.all(grantMonetaryBoardTxs);

        /*************************************************************
         * Grant permissions to new MonetarySupervisor
         **************************************************************/
        console.log(" granting permissions for new MS");
        await Promise.all([
            interestEarnedAccount.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
            newTokenAEur.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
            augmintReserves.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
            feeAccount.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts"),

            newMonetarySupervisor.grantPermission(newLocker.address, "LockerContracts"),
            newMonetarySupervisor.grantPermission(newLoanManager.address, "LoanManagerContracts"),
            newMonetarySupervisor.grantPermission(oldLocker1.address, "LockerContracts"),
            newMonetarySupervisor.grantPermission(oldLoanManager1.address, "LoanManagerContracts"),

            newMonetarySupervisor.setAcceptedLegacyAugmintToken(oldToken1.address, true),
            newMonetarySupervisor.setAcceptedLegacyAugmintToken(oldToken2.address, true),
            newMonetarySupervisor.setAcceptedLegacyAugmintToken(oldToken3.address, true),

            // to allow token conversion w/o fee
            // NB: NoFeeTransferContracts was set on the token contract in legacy token version.
            //      For newer versions this permission needs to be set on feeAccount
            oldToken1.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts"),
            oldToken2.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts"),
            feeAccount.grantPermission(oldToken3.address, "NoFeeTransferContracts")
        ]);

        // NB: don't forget to top up earned interest account with new tokens
        console.log(" Done with all migration steps. Updating truffle Migrations step manually");
        await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(17);
    });
};
