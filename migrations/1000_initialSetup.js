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

module.exports = function (deployer) {
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
        .then(async (initialSetupScript) => {
            // StabilityBoard permissions
            const [
                rates,
                feeAccount,
                interestEarnedAccount,
                tokenAEur,
                augmintReserves,
                monetarySupervisor,
                loanManager,
                locker,
                exchange,
                stabilityBoardProxy,
            ] = await Promise.all([
                Rates.at(Rates.address),
                FeeAccount.at(FeeAccount.address),
                InterestEarnedAccount.at(InterestEarnedAccount.address),
                TokenAEur.at(TokenAEur.address),
                AugmintReserves.at(AugmintReserves.address),
                MonetarySupervisor.at(MonetarySupervisor.address),
                LoanManager.at(LoanManager.address),
                Locker.at(Locker.address),
                Exchange.at(Exchange.address),
                StabilityBoardProxy.at(StabilityBoardProxy.address),
            ]);

            await Promise.all([
                rates.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
                feeAccount.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
                interestEarnedAccount.grantPermission(
                    StabilityBoardProxy.address,
                    web3.utils.asciiToHex("PermissionGranter")
                ),
                tokenAEur.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
                augmintReserves.grantPermission(
                    StabilityBoardProxy.address,
                    web3.utils.asciiToHex("PermissionGranter")
                ),
                monetarySupervisor.grantPermission(
                    StabilityBoardProxy.address,
                    web3.utils.asciiToHex("PermissionGranter")
                ),
                loanManager.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
                locker.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
                exchange.grantPermission(StabilityBoardProxy.address, web3.utils.asciiToHex("PermissionGranter")),
            ]);

            // run initial setup script
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
