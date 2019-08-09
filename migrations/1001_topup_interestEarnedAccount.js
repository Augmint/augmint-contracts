/* topup interestEarnedAccount with initial balance to able to lock */
const TokenAEur = artifacts.require("./TokenAEur.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");

module.exports = function(deployer) {
    deployer.then(async () => {
        const tokenAEur = TokenAEur.at(TokenAEur.address);
        const loanManager = LoanManager.at(LoanManager.address);

        await loanManager.newEthBackedLoan(0, 0, { value: web3.toWei(0.10845) }); // = 50 A-EUR

        await tokenAEur.transferWithNarrative(
            InterestEarnedAccount.address,
            5000,
            "Topup interestEarnedAccount for testing"
        );
    });
};
