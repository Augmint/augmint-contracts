const TokenAEur = artifacts.require("./TokenAEur.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Rates = artifacts.require("./Rates.sol");
const LoanManager = artifacts.require("./LoanManager.sol");

module.exports = function(deployer) {
    deployer.deploy(LoanManager, TokenAEur.address, MonetarySupervisor.address, Rates.address);
    deployer.then(async () => {
        const lm = LoanManager.at(LoanManager.address);

        console.log("   On a test network. Adding test loanProducts. Network id: ", web3.version.network);
        // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount (w/ 4 decimals), defaultingFeePt, isActive
        await lm.addLoanProduct(31536000, 860000, 550000, 1000, 50000, true); // 365d, 14% p.a.
        await lm.addLoanProduct(15552000, 937874, 550000, 1000, 50000, true); // 180d, 13% p.a.

        await lm.addLoanProduct(7776000, 971661, 600000, 1000, 50000, true); // 90d, 12%. p.a.
        await lm.addLoanProduct(2592000, 990641, 600000, 1000, 50000, true); // 30d, 12% p.a.
        await lm.addLoanProduct(1209600, 996337, 600000, 1000, 50000, true); // 14d, 10% p.a.
        await lm.addLoanProduct(604800, 998170, 600000, 1000, 50000, true); // 7d, 10% p.a.

        await lm.addLoanProduct(3600, 999989, 980000, 2000, 50000, true); // due in 1hr for testing repayments ? p.a.
        await lm.addLoanProduct(1, 999999, 990000, 3000, 50000, true); // defaults in 1 secs for testing ? p.a.
    });
};
