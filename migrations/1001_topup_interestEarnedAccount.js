/* topup interestEarnedAccount with initial balance to able to lock */
const TokenAEur = artifacts.require("./TokenAEur.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");

module.exports = function (deployer) {
    deployer.then(async () => {
        const [tokenAEur, loanManager] = await Promise.all([
            TokenAEur.at(TokenAEur.address),
            LoanManager.at(LoanManager.address),
        ]);

        await loanManager.newEthBackedLoan(0, 0, { value: web3.utils.toWei("0.10845") }); // = 50 A-EUR

        await tokenAEur.transferWithNarrative(
            InterestEarnedAccount.address,
            5000,
            "Topup interestEarnedAccount for testing"
        );
    });
};
