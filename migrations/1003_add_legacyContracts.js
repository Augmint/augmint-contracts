/* deploy legacy augmintToken, Locker,  LoanManager & Exchange contracts
    with test loans, locks & orders for local manual testing  */
const FeeAccount = artifacts.require("./FeeAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const Rates = artifacts.require("./Rates.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Locker = artifacts.require("./Locker.sol");
const LoanManager_1_0_12 = artifacts.require("./legacy/1.0.12/LoanManager_1_0_12.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = async function (deployer, network, accounts) {
    deployer.then(async () => {
        const [monetarySupervisor, feeAccount] = await Promise.all([
            MonetarySupervisor.at(MonetarySupervisor.address),
            FeeAccount.at(FeeAccount.address),
        ]);

        const oldToken = await TokenAEur.new(accounts[0], FeeAccount.address);

        const oldLocker = await Locker.new(accounts[0], oldToken.address, MonetarySupervisor.address);
        const oldLoanManager = await LoanManager_1_0_12.new(
            accounts[0],
            oldToken.address,
            MonetarySupervisor.address,
            Rates.address
        );
        const oldExchange = await Exchange.new(accounts[0], oldToken.address, Rates.address);

        await Promise.all([
            oldLoanManager.grantPermission(accounts[0], web3.utils.asciiToHex("StabilityBoard")),
            oldLocker.grantPermission(accounts[0], web3.utils.asciiToHex("StabilityBoard")),
            oldExchange.grantPermission(accounts[0], web3.utils.asciiToHex("StabilityBoard")),
        ]);

        await Promise.all([
            oldToken.grantPermission(MonetarySupervisor.address, web3.utils.asciiToHex("MonetarySupervisor")),

            monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken.address, true),

            oldToken.grantPermission(accounts[0], web3.utils.asciiToHex("MonetarySupervisor")), // "hack" for test to issue

            /* Locker permissions  & products */
            monetarySupervisor.grantPermission(oldLocker.address, web3.utils.asciiToHex("Locker")),
            feeAccount.grantPermission(oldLocker.address, web3.utils.asciiToHex("NoTransferFee")),
            oldLocker.addLockProduct(80001, 31536000, 1000, true), // 365 days, 8% p.a.
            oldLocker.addLockProduct(1, 60, 1000, true), // 1 minute for testing, ~69.15% p.a.

            /* LoanManager permissions & products */
            monetarySupervisor.grantPermission(oldLoanManager.address, web3.utils.asciiToHex("LoanManager")),
            feeAccount.grantPermission(oldLoanManager.address, web3.utils.asciiToHex("NoTransferFee")),
            oldLoanManager.addLoanProduct(1, 999999, 990000, 1000, 50000, true), // defaults in 1 secs for testing ? p.a.
            oldLoanManager.addLoanProduct(3600, 999989, 980000, 1000, 50000, true), // due in 1hr for testing repayments ? p.a.
            oldLoanManager.addLoanProduct(31536000, 860000, 550000, 1000, 50000, true), // 365d, 14% p.a.
            /* Exchange permissions */
            feeAccount.grantPermission(oldExchange.address, web3.utils.asciiToHex("NoTransferFee")),
        ]);

        await oldToken.issueTo(accounts[0], 20000); // issue some to account 0

        await Promise.all([
            oldToken.transferAndNotify(oldLocker.address, 1500, 0),
            oldToken.transferAndNotify(oldLocker.address, 1600, 1),

            oldLoanManager.newEthBackedLoan(0, { value: web3.utils.toWei("0.1") }),
            oldLoanManager.newEthBackedLoan(2, { value: web3.utils.toWei("0.2") }),
            oldToken.transferAndNotify(oldExchange.address, 2000, 1010000),
            oldToken.transferAndNotify(oldExchange.address, 1100, 980000),
            oldExchange.placeBuyTokenOrder(990000, { value: web3.utils.toWei("0.01") }),
            oldExchange.placeBuyTokenOrder(1020000, { value: web3.utils.toWei("0.011") }),
        ]);

        console.log(
            ` *** On local ganache - deployed a set of legacy mock contracts for manual testing:
             TokenAEur: ${oldToken.address}
             Locker: ${oldLocker.address}
             LoanManager_1_0_12: ${oldLoanManager.address}
             Exchange: ${oldExchange.address}`
        );
    });
};
