const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

const localTest_initialSetup = artifacts.require("./SB_scripts/localTest/localTest_initialSetup.sol");

module.exports = function(deployer) {
    deployer
        .deploy(
            localTest_initialSetup,
            Rates.address,
            FeeAccount.address,
            AugmintReserves.address,
            InterestEarnedAccount.address,
            TokenAEur.address,
            MonetarySupervisor.address,
            LoanManager.address,
            Locker.address,
            Exchange.address
        )
        .then(async initialSetupScript => {
            // StabilityBoardSignerContract permissions
            const rates = Rates.at(Rates.address);
            const feeAccount = FeeAccount.at(FeeAccount.address);
            const interestEarnedAccount = InterestEarnedAccount.at(InterestEarnedAccount.address);
            const tokenAEur = TokenAEur.at(TokenAEur.address);
            const augmintReserves = AugmintReserves.at(AugmintReserves.address);
            const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
            const loanManager = LoanManager.at(LoanManager.address);
            const locker = Locker.at(Locker.address);
            const exchange = Exchange.at(Exchange.address);
            await Promise.all([
                rates.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                feeAccount.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                interestEarnedAccount.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                tokenAEur.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                augmintReserves.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                monetarySupervisor.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                loanManager.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                locker.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract"),
                exchange.grantPermission(StabilityBoardSigner.address, "PermissionGranterContract")
            ]);

            // run initial setup script
            const stabilityBoardSigner = StabilityBoardSigner.at(StabilityBoardSigner.address);
            await stabilityBoardSigner.sign(initialSetupScript.address);
            const tx = await stabilityBoardSigner.execute(initialSetupScript.address);

            if (!tx.logs[0].args.result) {
                throw new Error(`initialSetupScript execution failed.
                    Script address: ${initialSetupScript.address}
                    Execution hash: ${tx.receipt.transactionHash}\n`);
            }

            // In non test ( non local) deployments deployer account
            // must revoke it's own StabilityBoardSignerContract permission
        });
};
