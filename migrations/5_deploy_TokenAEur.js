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
        200, // min: 0.02 A-EUR
        50000, // max fee: 5 A-EUR
        800000, // loanToDepositLockLimit: 80%
        1200000, // loanToDepositLoanLimit: 120 %

        // Parameters Used to avoid system halt when there totalLoanAmount or totalLockedAmount is 0 or very low.
        5000000 /* lockNoLimitAllowance in token - if totalLockAmount is below this then a new lock is allowed
                    up to this amount even if it will bring the loanToDepositRatio BELOW loanToDepositLoanLimit
                    (interest earned account balance still applies a limit on top of it)
                */,
        5000000 /* loanNoLimitAllowance in token - if totalLoanAmount is below this then a new loan is allowed
                    up this amount even if it will bring the loanToDepositRatio
                    ABOVE loanToDepositLoanLimit
                */
    );

    const tokenAEur = TokenAEur.at(TokenAEur.address);
    await tokenAEur.grantMultiplePermissions(accounts[0], ["MonetaryBoard"]);
};
