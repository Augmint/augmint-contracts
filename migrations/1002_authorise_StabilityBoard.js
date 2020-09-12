/* Authorise accounts[0] on local test deploys to execute StabilityBoard functions.
  NB: for testnets / mainnet deploys process is different
*/

const FeeAccount = artifacts.require("./FeeAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Locker = artifacts.require("./Locker.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = function (deployer, network, accounts) {
    deployer.then(async () => {
        const stabilityBoardAccounts = [accounts[0]];

        const [
            feeAccount,
            augmintReserves,
            tokenAEur,
            interestEarnedAccount,
            monetarySupervisor,
            loanManager,
            locker,
            exchange,
        ] = await Promise.all([
            FeeAccount.at(FeeAccount.address),
            AugmintReserves.at(AugmintReserves.address),
            TokenAEur.at(TokenAEur.address),
            InterestEarnedAccount.at(InterestEarnedAccount.address),
            MonetarySupervisor.at(MonetarySupervisor.address),
            LoanManager.at(LoanManager.address),
            Locker.at(Locker.address),
            Exchange.at(Exchange.address),
        ]);

        const grantTxs = stabilityBoardAccounts.map((acc) => [
            feeAccount.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            augmintReserves.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            tokenAEur.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            interestEarnedAccount.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            monetarySupervisor.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            locker.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            loanManager.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
            exchange.grantPermission(acc, web3.utils.asciiToHex("StabilityBoard")),
        ]);

        await Promise.all(grantTxs);
    });
};
