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

module.exports = function(deployer, network, accounts) {
    deployer.then(async () => {
        const stabilityBoardAccounts = [accounts[0]];

        const feeAccount = FeeAccount.at(FeeAccount.address);
        const augmintReserves = AugmintReserves.at(AugmintReserves.address);
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const interestEarnedAccount = InterestEarnedAccount.at(InterestEarnedAccount.address);
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const loanManager = LoanManager.at(LoanManager.address);
        const locker = Locker.at(Locker.address);
        const exchange = Exchange.at(Exchange.address);

        const grantTxs = stabilityBoardAccounts.map(acc => [
            feeAccount.grantPermission(acc, "StabilityBoard"),
            augmintReserves.grantPermission(acc, "StabilityBoard"),
            tokenAEur.grantPermission(acc, "StabilityBoard"),
            interestEarnedAccount.grantPermission(acc, "StabilityBoard"),
            monetarySupervisor.grantPermission(acc, "StabilityBoard"),
            locker.grantPermission(acc, "StabilityBoard"),
            loanManager.grantPermission(acc, "StabilityBoard"),
            exchange.grantPermission(acc, "StabilityBoard")
        ]);

        await Promise.all(grantTxs);
    });
};
