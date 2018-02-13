const AugmintReserves = artifacts.require("./AugmintReserves.sol");

module.exports = {
    newMonetarySupervisorMock,
    withdrawFromReserve
};

const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
let tokenAEur, monetarySupervisor, augmintReserves, interestEarnedAccount;

async function newMonetarySupervisorMock(augmintToken, tokenOwner = web3.eth.accounts[0]) {
    tokenAEur = augmintToken;
    augmintReserves = await AugmintReserves.new();
    monetarySupervisor = await MonetarySupervisor.new(
        tokenAEur.address,
        augmintReserves.address,
        InterestEarnedAccount.address,

        /* Parameters Used to ensure totalLoanAmount or totalLockedAmount difference is withing limit and system also works
            when any of those 0 or low. */
        200000 /* ltdDifferenceLimit = 20%  allow lock or loan if Loan To Deposut ratio stay within 1 +- this param
                                                stored as parts per million */,
        50000000 /* allowedLtdDifferenceAmount =5,000 A-EUR - if totalLoan and totalLock difference is less than that
                                        then allow loan or lock even if ltdDifference limit would go off with it */,
        { from: tokenOwner }
    );

    interestEarnedAccount = InterestEarnedAccount.at(InterestEarnedAccount.address);
    await interestEarnedAccount.grantMultiplePermissions(monetarySupervisor.address, ["MonetarySupervisorContract"]);
    await tokenAEur.grantMultiplePermissions(monetarySupervisor.address, ["MonetarySupervisorContract"]);
    await augmintReserves.grantMultiplePermissions(monetarySupervisor.address, ["MonetarySupervisorContract"]);
    await tokenAEur.grantMultiplePermissions(monetarySupervisor.address, ["NoFeeTransferContracts"]);
    await tokenAEur.grantMultiplePermissions(augmintReserves.address, ["NoFeeTransferContracts"]);
    return monetarySupervisor;
}

async function withdrawFromReserve(to, amount) {
    await augmintReserves.withdrawTokens(tokenAEur.address, to, amount, "withdrawal for tests");
}
