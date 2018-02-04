const SafeMath = artifacts.require("./SafeMath.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const FeeAccount = artifacts.require("./FeeAccount.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.link(SafeMath, TokenAEur);
    await deployer.deploy(
        TokenAEur,
        FeeAccount.address,
        InterestEarnedAccount.address,
        2000, // transferFeePt in parts per million = 0.2%
        200, // min: 0.02 ACE
        50000, // max fee: 5 ACE
        800000, // loanToDepositLockLimit: 80%
        1200000 // loanToDepositLoanLimit: 120 %
    );

    const tokenAEur = TokenAEur.at(TokenAEur.address);
    await tokenAEur.grantMultiplePermissions(accounts[0], ["MonetaryBoard"]);
};
