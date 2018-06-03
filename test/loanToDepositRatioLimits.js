/* for test case calculations see: https://docs.google.com/spreadsheets/d/1MeWYPYZRIm1n9lzpvbq8kLfQg1hhvk5oJY6NrR401S0 */

const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");
const MonetarySupervisor = artifacts.require("MonetarySupervisor.sol");
const InterestEarnedAccount = artifacts.require("./InterestEarnedAccount.sol");
const Rates = artifacts.require("Rates.sol");
const Locker = artifacts.require("Locker.sol");
const testHelpers = require("./helpers/testHelpers.js");
const loanTestHelpers = require("./helpers/loanTestHelpers.js");

let augmintToken;
let monetarySupervisor;
let loanManager;
let locker;
let loanProductId;
let lockProductId;
let snapshotId;
let rate;

const ltdParams = { lockDifferenceLimit: 300000, loanDifferenceLimit: 200000, allowedDifferenceAmount: 100000 };

const lockPerTermInterest = 8330;
const PERCENT_100 = 1000000;

const getLtdLimits = async () => {
    const [maxLockByLtd, maxLoanByLtd, maxLock, maxLoan] = await Promise.all([
        monetarySupervisor.getMaxLockAmountAllowedByLtd(),
        monetarySupervisor.getMaxLoanAmountAllowedByLtd(),
        monetarySupervisor.getMaxLockAmount(500, lockPerTermInterest),
        monetarySupervisor.getMaxLoanAmount(3000)
    ]);
    return { maxLockByLtd, maxLoanByLtd, maxLock, maxLoan };
};

contract("Loan to Deposit ratio tests", accounts => {
    before(async () => {
        augmintToken = tokenTestHelpers.augmintToken;
        loanManager = loanTestHelpers.loanManager;
        locker = Locker.at(Locker.address);
        const rates = Rates.at(Rates.address);

        /* setup a new blank MS independent from migration scripts */

        monetarySupervisor = await MonetarySupervisor.new(
            augmintToken.address,
            tokenTestHelpers.augmintReserves.address,
            InterestEarnedAccount.address,
            ltdParams.lockDifferenceLimit,
            ltdParams.loanDifferenceLimit,
            ltdParams.allowedDifferenceAmount
        );

        await Promise.all([
            tokenTestHelpers.interestEarnedAccount.grantPermission(
                monetarySupervisor.address,
                "MonetarySupervisorContract"
            ),
            augmintToken.grantPermission(monetarySupervisor.address, "MonetarySupervisorContract"),
            tokenTestHelpers.feeAccount.grantPermission(monetarySupervisor.address, "NoFeeTransferContracts"),
            tokenTestHelpers.augmintReserves.grantPermission(monetarySupervisor.address, "MonetarySupervisorContract"),
            locker.setMonetarySupervisor(monetarySupervisor.address),
            loanManager.setSystemContracts(rates.address, monetarySupervisor.address),
            monetarySupervisor.grantPermission(accounts[0], "StabilityBoardSignerContract"),
            monetarySupervisor.grantPermission(locker.address, "LockerContracts"),
            monetarySupervisor.grantPermission(loanManager.address, "LoanManagerContracts")
        ]);

        const [interestEarnedBalance] = await Promise.all([
            augmintToken.balanceOf(InterestEarnedAccount.address),
            tokenTestHelpers.issueToReserve(10000000),
            // term (in sec), discountRate, loanCoverageRatio, minDisbursedAmount, defaultingFeePt, isActive
            loanManager.addLoanProduct(60, 1000000, 1000000, 500, 5000, true),
            // (perTermInterest,  durationInSecs, minimumLockAmount, isActive)
            locker.addLockProduct(lockPerTermInterest, 60, 100, true),
            monetarySupervisor.setLtdParams(
                ltdParams.lockDifferenceLimit,
                ltdParams.loanDifferenceLimit,
                ltdParams.allowedDifferenceAmount
            )
        ]);

        [loanProductId, lockProductId, rate] = await Promise.all([
            loanManager.getProductCount().then(res => res.toNumber() - 1),
            locker.getLockProductCount().then(res => res.toNumber() - 1),
            rates.rates("EUR").then(res => res[0]),
            tokenTestHelpers.withdrawFromReserve(accounts[0], 10000000),
            tokenTestHelpers.interestEarnedAccount.withdraw(
                augmintToken.address,
                accounts[0],
                interestEarnedBalance,
                0,
                "clear token balance for tests"
            )
        ]);
    });

    beforeEach(async function() {
        if (snapshotId) {
            await testHelpers.revertSnapshot(snapshotId);
        }
        snapshotId = await testHelpers.takeSnapshot();
    });

    it("LTD when both totalLock and totalLoan 0", async function() {
        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "100000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "60024");
        assert.equal(limits.maxLoan.toString(), "100000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "100000");
        assert.equal(limits.maxLoan.toString(), "100000");
    });

    it("LTD when totalLoan 0 and totalLock > 0 and allowed difference amount is in effect", async function() {
        //lock some
        const amountToLock = 1000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "99000");
        assert.equal(limits.maxLoanByLtd.toString(), "101000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "101000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "99000");
        assert.equal(limits.maxLoanByLtd.toString(), "101000");
        assert.equal(limits.maxLock.toString(), "60024");
        assert.equal(limits.maxLoan.toString(), "101000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "99000");
        assert.equal(limits.maxLoanByLtd.toString(), "101000");
        assert.equal(limits.maxLock.toString(), "99000");
        assert.equal(limits.maxLoan.toString(), "101000");
    });

    it("LTD when totalLock = 0 and totalLoan > 0 and allowed difference amount is in effect", async function() {
        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((3000 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "103000");
        assert.equal(limits.maxLoanByLtd.toString(), "97000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "97000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "103000");
        assert.equal(limits.maxLoanByLtd.toString(), "97000");
        assert.equal(limits.maxLock.toString(), "60024");
        assert.equal(limits.maxLoan.toString(), "97000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "103000");
        assert.equal(limits.maxLoanByLtd.toString(), "97000");
        assert.equal(limits.maxLock.toString(), "103000");
        assert.equal(limits.maxLoan.toString(), "97000");
    });

    it("LTD when totalLock = totalLoan and allowed difference amount is in effect", async function() {
        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((3000 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // lock the same amount
        const amountToLock = 3000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "100000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "60024");
        assert.equal(limits.maxLoan.toString(), "100000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 500);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "100000");
        assert.equal(limits.maxLoanByLtd.toString(), "100000");
        assert.equal(limits.maxLock.toString(), "100000");
        assert.equal(limits.maxLoan.toString(), "100000");
    });

    it("LTD when totalLock < totalLoan & difference < allowedDifferenceAmount", async function() {
        // set allowedDifferenceAmount temporaly to allow setup test base
        await monetarySupervisor.setLtdParams(ltdParams.lockDifferenceLimit, ltdParams.loanDifferenceLimit, 1000000);

        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((640000 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // lock less than the loan
        const amountToLock = 600000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // reset allowedDifferenceAmount
        await monetarySupervisor.setLtdParams(
            ltdParams.lockDifferenceLimit,
            ltdParams.loanDifferenceLimit,
            ltdParams.allowedDifferenceAmount
        );

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "80000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 1000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "120048");
        assert.equal(limits.maxLoan.toString(), "80000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 9000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "314285");
        assert.equal(limits.maxLoan.toString(), "80000");
    });

    it("LTD when totalLock < totalLoan & difference > allowedDifferenceAmount", async function() {
        // set allowedDifferenceAmount temporaly to allow setup test base
        await monetarySupervisor.setLtdParams(ltdParams.lockDifferenceLimit, ltdParams.loanDifferenceLimit, 1000000);

        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((640000 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // lock less than the loan
        const amountToLock = 600000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // reset allowedDifferenceAmount
        await monetarySupervisor.setLtdParams(ltdParams.lockDifferenceLimit, ltdParams.loanDifferenceLimit, 10000);

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "80000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 1000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "120048");
        assert.equal(limits.maxLoan.toString(), "80000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 9000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "314285");
        assert.equal(limits.maxLoanByLtd.toString(), "80000");
        assert.equal(limits.maxLock.toString(), "314285");
        assert.equal(limits.maxLoan.toString(), "80000");
    });

    it("LTD when totalLock > totalLoan & difference is < allowedDifferenceAmount", async function() {
        // set allowedDifferenceAmount temporaly to allow setup test base
        await monetarySupervisor.setLtdParams(ltdParams.lockDifferenceLimit, ltdParams.loanDifferenceLimit, 1000000);

        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((600000 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // lock more than the loan
        const amountToLock = 640000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // reset allowedDifferenceAmount
        await monetarySupervisor.setLtdParams(
            ltdParams.lockDifferenceLimit,
            ltdParams.loanDifferenceLimit,
            ltdParams.allowedDifferenceAmount
        );

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "217142");
        assert.equal(limits.maxLoanByLtd.toString(), "168000");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "168000");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 1000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "217142");
        assert.equal(limits.maxLoanByLtd.toString(), "168000");
        assert.equal(limits.maxLock.toString(), "120048");
        assert.equal(limits.maxLoan.toString(), "168000");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 9000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "217142");
        assert.equal(limits.maxLoanByLtd.toString(), "168000");
        assert.equal(limits.maxLock.toString(), "217142");
        assert.equal(limits.maxLoan.toString(), "168000");
    });

    it("LTD when totalLock > totalLoan & difference > allowedDifferenceAmount", async function() {
        // set allowedDifferenceAmount temporaly to allow setup test base
        await monetarySupervisor.setLtdParams(ltdParams.lockDifferenceLimit, ltdParams.loanDifferenceLimit, 10000000);

        // get a loan
        const collateralAmount = global.web3v1.utils.toWei((359974 / rate).toString());
        await loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount });

        // lock more than the loan
        const amountToLock = 410000;
        const interestAmount = Math.floor((amountToLock * lockPerTermInterest) / PERCENT_100);
        await augmintToken.transfer(InterestEarnedAccount.address, interestAmount);
        await augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId);

        // reset allowedDifferenceAmount
        await monetarySupervisor.setLtdParams(200000, 200000, 10000);

        // Earned interest 0
        let limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "39967");
        assert.equal(limits.maxLoanByLtd.toString(), "132026");
        assert.equal(limits.maxLock.toString(), "0");
        assert.equal(limits.maxLoan.toString(), "132026");

        // Earned interest > 0 and maxlock by interest < allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 1000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "39967");
        assert.equal(limits.maxLoanByLtd.toString(), "132026");
        assert.equal(limits.maxLock.toString(), "39967");
        assert.equal(limits.maxLoan.toString(), "132026");

        // Earned interest > 0 and maxlock  by interest > allowedDifferenceAmount
        await augmintToken.transfer(InterestEarnedAccount.address, 9000);
        limits = await getLtdLimits();
        assert.equal(limits.maxLockByLtd.toString(), "39967");
        assert.equal(limits.maxLoanByLtd.toString(), "132026");
        assert.equal(limits.maxLock.toString(), "39967");
        assert.equal(limits.maxLoan.toString(), "132026");
    });

    it("maxLock & maxLoan should be 0 if lock/loan allowed by LTD is < minLock/LoanAmount", async function() {
        const [maxLock, maxLoan] = await Promise.all([
            monetarySupervisor.getMaxLockAmount(ltdParams.allowedDifferenceAmount + 1, lockPerTermInterest),
            monetarySupervisor.getMaxLoanAmount(ltdParams.allowedDifferenceAmount + 1)
        ]);
        assert.equal(maxLock.toString(), "0");
        assert.equal(maxLoan.toString(), "0");
    });

    it("should NOT allow to lock more than maxLockAmountAllowedByLtd ", async function() {
        // transfer enough to interestEarnedAccount so lock is not be bound by it
        await augmintToken.transfer(InterestEarnedAccount.address, 10000);
        const amountToLock = ltdParams.allowedDifferenceAmount + 1;
        await testHelpers.expectThrow(augmintToken.transferAndNotify(locker.address, amountToLock, lockProductId));
    });

    it("should NOT allow to borrow more than maxLoanAmountAllowedByLtd ", async function() {
        const collateralAmount = global.web3v1.utils.toWei(((ltdParams.allowedDifferenceAmount + 1) / rate).toString());
        await testHelpers.expectThrow(loanManager.newEthBackedLoan(loanProductId, { value: collateralAmount }));
    });
});
