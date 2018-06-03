/* Authorise accounts[0] on local test deploys to execute multiSig functions.
  NB: for rinkeby / testnet deploys process is different
*/

const PreToken = artifacts.require("./PreToken.sol");
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

        const preToken = PreToken.at(PreToken.address);
        const feeAccount = FeeAccount.at(FeeAccount.address);
        const augmintReserves = AugmintReserves.at(AugmintReserves.address);
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const interestEarnedAccount = InterestEarnedAccount.at(InterestEarnedAccount.address);
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const loanManager = LoanManager.at(LoanManager.address);
        const locker = Locker.at(Locker.address);
        const exchange = Exchange.at(Exchange.address);

        const grantTxs = stabilityBoardAccounts.map(acc => [
            feeAccount.grantPermission(acc, "StabilityBoardSignerContract"),
            augmintReserves.grantPermission(acc, "StabilityBoardSignerContract"),
            tokenAEur.grantPermission(acc, "StabilityBoardSignerContract"),
            interestEarnedAccount.grantPermission(acc, "StabilityBoardSignerContract"),
            monetarySupervisor.grantPermission(acc, "StabilityBoardSignerContract"),
            locker.grantPermission(acc, "StabilityBoardSignerContract"),
            loanManager.grantPermission(acc, "StabilityBoardSignerContract"),
            exchange.grantPermission(acc, "StabilityBoardSignerContract")
        ]);
        grantTxs.push(
            preToken.grantMultiplePermissions(accounts[0], [
                "PreTokenAgreementSignerContract",
                "PreTokenIssueSignerContract"
            ])
        );

        await Promise.all(grantTxs);
    });
};
