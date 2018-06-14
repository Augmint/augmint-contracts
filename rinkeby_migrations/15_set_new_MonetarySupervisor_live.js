/* set new MonetarySupervisor deployed in prev step. live and adjust new LTD params
    It's switching it live, i.e.:
        - granting permissions for new MS in deployed contracts and revoking from old MS contract
        - setting new MS in Locker and LoanManager contracts
        - migrating totalLoan and totalLockedAmount from old MS
*/
const Migrations = artifacts.require("./Migrations.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const FeeAccount = artifacts.require("./FeeAccount");

module.exports = function(deployer, network) {
    deployer.then(async () => {
        // NB: web3.version.network throws error with truffle migrate --dry-run...
        if (network === "rinkeby" || network === "rinkeby-fork") {
            // Truffle artifacts are in unknown state when truffle migrate starts from this step on rinkeby.
            // Therefore we can't use addresses from there.
            // But this script will be run only ONCE on rinkeby so it's fine to hardcode addresses
            const ratesAddress = "0xcA8100FCcb479516A5b30f8Bc5dAeA09Fb7a7473";
            const tokenAEur = TokenAEur.at("0x135893f1a6b3037bb45182841f18f69327366992");
            const augmintReserves = AugmintReserves.at("0xc70b65e40f877cdc6d8d2ebfd44d63efbeb7fc6d");
            const interestEarnedAccount = InterestEarnedAccount.at("0x3a414d7636defb9d3dfb7342984fe3f7b5125df6");
            const locker = Locker.at("0xf98AE1fb568B267A7632BF54579A153C892E2ec2");
            const loanManager = LoanManager.at("0xBdb02f82d7Ad574f9F549895caf41E23a8981b07");
            const feeAccount = FeeAccount.at("0xc26667132b0B798ab87864f7c29c0819c887aADB");
            const oldMonetarySupervisor = MonetarySupervisor.at("0x2E8b07A973f8E136Aa39922DFF21AD187a6E8E7d");

            const oldToken1 = TokenAEur.at("0x95aa79d7410eb60f49bfd570b445836d402bd7b1");
            const oldToken2 = TokenAEur.at("0xa35d9de06895a3a2e7ecae26654b88fe71c179ea");

            // New MS which has been deployed in prev. step but not live yet
            const newMonetarySupervisor = MonetarySupervisor.at("0xa00a5d1882c3f690e3d0d975ebe378120b70ae87");

            // 1.  grant permissions for new MS
            await Promise.all([
                interestEarnedAccount.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
                tokenAEur.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
                augmintReserves.grantPermission(newMonetarySupervisor.address, "MonetarySupervisorContract"),
                feeAccount.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts"),

                newMonetarySupervisor.grantPermission(locker.address, "LockerContracts"),
                newMonetarySupervisor.grantPermission(loanManager.address, "LoanManagerContracts"),

                newMonetarySupervisor.setAcceptedLegacyAugmintToken(oldToken1.address, true),
                newMonetarySupervisor.setAcceptedLegacyAugmintToken(oldToken2.address, true),

                // to allow token conversion w/o fee
                // NB: NoFeeTransferContracts was set on the token contract in legacy token version.
                //      For upcoming versions this permission needs to be set on feeAccount
                oldToken1.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts"),
                oldToken2.grantPermission(newMonetarySupervisor.address, "NoFeeTransferContracts")
            ]);

            // 2. switch new MS to live:
            await Promise.all([
                locker.setMonetarySupervisor(newMonetarySupervisor.address),
                loanManager.setSystemContracts(ratesAddress, newMonetarySupervisor.address)
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

            //  4. Revoke permission from old MS

            await Promise.all([
                feeAccount.revokePermission(oldMonetarySupervisor.address, "NoFeeTransferContracts"),
                interestEarnedAccount.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),
                tokenAEur.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),
                augmintReserves.revokePermission(oldMonetarySupervisor.address, "MonetarySupervisorContract"),

                oldMonetarySupervisor.revokePermission(locker.address, "LockerContracts"),
                oldMonetarySupervisor.revokePermission(loanManager.address, "LoanManagerContracts")
            ]);

            // 5. update truffle Migrations step manually
            await Migrations.at("0xb96f7e79a6b3faf4162e274ff764ca9de598b0c5").setCompleted(14);
        } else {
            // Not rinkeby, we assume it's a private network: scripts in this folder are not intended to run on other networks!
            // we don't need to do anything as previous steps deployed latest version of MonetarySupervisor
            console.log("On ", network, "not Rinkeby. Not executing anything step 15.");
        }
    });
};
