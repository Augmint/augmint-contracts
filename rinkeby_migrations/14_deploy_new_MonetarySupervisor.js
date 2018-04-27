/* This step is a new deploy of MonetarySupervisor contract without putting it live yet
It contains a bug fix in maxLockAmount calculation
NB: This migration step is only deploying the new contract and authorising existing contracts.
    It's **NOT** switching it live, i.e.:
        - not setting new MS in Locker and LoanManager contracts
        - not migrating totalLoan and totalLockedAmount from old MS
        - not revoking permissions from old MS contract
 These steps will be executed after this sucessful deployment and when new artifacts are avialable for FE.
*/

const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = function(deployer) {
    let tokenAEurAddress;
    let augmintReservesAddress;
    let interestEarnedAccountAddress;

    if (web3.version.network == 4) {
        // Truffle artifacts are in unknown state when truffle migrate starts from this step on rinkeby.
        // Therefore we can't use addresses from there.
        // But this script will be run only ONCE on rinkeby so it's fine to hardcode addresses
        tokenAEurAddress = "0x135893f1a6b3037bb45182841f18f69327366992";
        augmintReservesAddress = "0xc70b65e40f877cdc6d8d2ebfd44d63efbeb7fc6d";
        interestEarnedAccountAddress = "0x3a414d7636defb9d3dfb7342984fe3f7b5125df6";
    } else {
        // Not rinkeby, we assume it's a private network: scripts in this folder are not intended to run on other networks!
        // On private networks we migrate from scratch so contracts just has been deployed and truffle artifacts are available with correct deployment addresses.
        tokenAEurAddress = TokenAEur.address;
        augmintReservesAddress = AugmintReserves.address;
        interestEarnedAccountAddress = InterestEarnedAccount.address;
    }

    deployer.deploy(
        MonetarySupervisor,
        tokenAEurAddress,
        augmintReservesAddress,
        interestEarnedAccountAddress,

        /* Parameters Used to ensure totalLoanAmount or totalLockedAmount difference is withing limit and system also works
            when any of those 0 or low. */
        200000 /* ltdLockDifferenceLimit = 20%  allow lock if Loan To Deposit ratio stays within 1 - this param
                                                stored as parts per million */,
        200000 /* ltdLoanDifferenceLimit = 20%  allow loan if Loan To Deposit ratio stays within 1 + this param
                                                                                        stored as parts per million */,
        10000 /* allowedLtdDifferenceAmount = 100 A-EUR - if totalLoan and totalLock difference is less than that
                                        then allow loan or lock even if ltdDifference limit would go off with it */
    );
};
