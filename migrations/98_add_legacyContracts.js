/* deploy a legacy augmintToken, Locker,  LoanManager & Exchange contracts
    with test loans , locks & orders for local manual testing  */
const FeeAccount = artifacts.require("./FeeAccount.sol");
const TokenAEur = artifacts.require("./TokenAEur.sol");
const Rates = artifacts.require("./Rates.sol");
const MonetarySupervisor = artifacts.require("./MonetarySupervisor.sol");
const Locker = artifacts.require("./Locker.sol");
const LoanManager = artifacts.require("./LoanManager.sol");
const Exchange = artifacts.require("./Exchange.sol");

module.exports = async function(deployer, network, accounts) {
    deployer.then(async () => {
        const monetarySupervisor = MonetarySupervisor.at(MonetarySupervisor.address);
        const feeAccount = FeeAccount.at(FeeAccount.address);

        const oldToken = await TokenAEur.new(FeeAccount.address);

        const [oldLocker, oldLoanManager, oldExchange] = await Promise.all([
            Locker.new(oldToken.address, MonetarySupervisor.address),
            LoanManager.new(oldToken.address, MonetarySupervisor.address, Rates.address),
            Exchange.new(oldToken.address, Rates.address)
        ]);

        await Promise.all([
            oldToken.grantPermission(MonetarySupervisor.address, "MonetarySupervisorContract"),

            monetarySupervisor.setAcceptedLegacyAugmintToken(oldToken.address, true),

            oldToken.grantPermission(accounts[0], "MonetarySupervisorContract"), // "hack" for test to issue

            /* Locker permissions  & products */
            oldLocker.grantPermission(accounts[0], "MonetaryBoard"),
            monetarySupervisor.grantPermission(oldLocker.address, "LockerContracts"),
            feeAccount.grantPermission(oldLocker.address, "NoFeeTransferContracts"),
            oldLocker.addLockProduct(80001, 31536000, 1000, true), // 365 days, 8% p.a.
            oldLocker.addLockProduct(1, 60, 1000, true), // 1 minute for testing, ~69.15% p.a.

            /* LoanManager permissions & products */
            oldLoanManager.grantPermission(accounts[0], "MonetaryBoard"),
            monetarySupervisor.grantPermission(oldLoanManager.address, "LoanManagerContracts"),
            feeAccount.grantPermission(oldLoanManager.address, "NoFeeTransferContracts"),
            oldLoanManager.addLoanProduct(1, 999999, 990000, 1000, 50000, true), // defaults in 1 secs for testing ? p.a.
            oldLoanManager.addLoanProduct(3600, 999989, 980000, 1000, 50000, true), // due in 1hr for testing repayments ? p.a.
            oldLoanManager.addLoanProduct(31536000, 860000, 550000, 1000, 50000, true), // 365d, 14% p.a.

            /* Exchange permissions */
            feeAccount.grantPermission(oldExchange.address, "NoFeeTransferContracts"),
            oldExchange.grantPermission(accounts[0], "MonetaryBoard")
        ]);

        await oldToken.issueTo(accounts[0], 20000); // issue some to account 0

        await Promise.all([
            oldToken.transferAndNotify(oldLocker.address, 1500, 0),
            oldToken.transferAndNotify(oldLocker.address, 1600, 1),

            oldLoanManager.newEthBackedLoan(0, { value: web3.toWei(0.1) }),
            oldLoanManager.newEthBackedLoan(1, { value: web3.toWei(0.11) }),
            oldLoanManager.newEthBackedLoan(2, { value: web3.toWei(0.12) }),

            oldToken.transferAndNotify(oldExchange.address, 2000, 1010000),
            oldToken.transferAndNotify(oldExchange.address, 1100, 980000),
            oldExchange.placeBuyTokenOrder(990000, { value: web3.toWei(0.01) }),
            oldExchange.placeBuyTokenOrder(1020000, { value: web3.toWei(0.011) })
        ]);

        console.log(
            ` *** On local ganache - deployed a set of legacy mock contracts for manual testing:
             TokenAEur: ${oldToken.address}
             Locker: ${oldLocker.address}
             LoanManager: ${oldLoanManager.address}
             Exchange: ${oldExchange.address}`
        );
    });
};
