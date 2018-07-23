const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const Rates = artifacts.require("./Rates.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");
const SafeMathTester = artifacts.require("./test/SafeMathTester.sol");

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
            Exchange.address,
            SafeMathTester.address
        )
        .then(async initialSetupScript => {
            // StabilityBoard permissions
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
                rates.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                feeAccount.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                interestEarnedAccount.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                tokenAEur.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                augmintReserves.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                monetarySupervisor.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                loanManager.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                locker.grantPermission(StabilityBoardProxy.address, "PermissionGranter"),
                exchange.grantPermission(StabilityBoardProxy.address, "PermissionGranter")
            ]);

            // run initial setup script
            const stabilityBoardProxy = StabilityBoardProxy.at(StabilityBoardProxy.address);
            await stabilityBoardProxy.sign(initialSetupScript.address);
            const tx = await stabilityBoardProxy.execute(initialSetupScript.address);

            if (!tx.logs[0].args.result) {
                throw new Error(`initialSetupScript execution failed.
                    Script address: ${initialSetupScript.address}
                    Execution hash: ${tx.receipt.transactionHash}\n`);
            }

            // In non test ( non local) deployments deployer account
            // must revoke it's own StabilityBoard permission
        });
};
