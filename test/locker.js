const Locker = artifacts.require("Locker");

const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const testHelpers = require("./helpers/testHelper.js");

let tokenHolder = "";
let interestEarnedAddress = "";
let lockerInstance = null;
let tokenAceInstance = null;

async function getBalances(tokenInstance, accounts) {
    const balances = {};

    await Promise.all(
        accounts.map(async address => {
            balances[address] = (await tokenInstance.balances(address)).toNumber();
        })
    );

    return balances;
}

contract("Lock", accounts => {
    before(async function() {
        const superUserAddress = accounts[0];
        tokenHolder = accounts[1];

        tokenAceInstance = await tokenAceTestHelper.newTokenAceMock(superUserAddress);
        lockerInstance = await Locker.new(tokenAceInstance.address);

        interestEarnedAddress = await tokenAceInstance.interestEarnedAccount();

        await tokenAceInstance.grantMultiplePermissions(lockerInstance.address, [
            "LockerContracts",
            "NoFeeTransferContracts"
        ]);

        await tokenAceInstance.issue(50000);
        await tokenAceInstance.withdrawTokens(tokenHolder, 40000);
        await tokenAceInstance.withdrawTokens(interestEarnedAddress, 10000);
    });

    it("should allow lock products to be created", async function() {
        // create lock product with 5% per term, and 60 sec lock time:
        const tx = await lockerInstance.addLockProduct(50000, 60, 100, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

        await testHelpers.assertEvent(lockerInstance, "NewLockProduct", {
            lockProductId: 0,
            perTermInterest: 50000,
            durationInSecs: 60,
            minimumLockAmount: 100,
            isActive: true
        });
    });

    it("should allow the number of lock products to be queried", async function() {
        const startingNumLocks = (await lockerInstance.getLockProductCount()).toNumber();

        // create lock product with 5% per term, and 120 sec lock time:
        const tx = await lockerInstance.addLockProduct(50000, 120, 0, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

        const endNumLocks = (await lockerInstance.getLockProductCount()).toNumber();

        assert(startingNumLocks + 1 === endNumLocks);
    });

    it("should allow the getting of individual lock products", async function() {
        // create lock product with 8% per term, and 120 sec lock time:
        await lockerInstance.addLockProduct(80000, 120, 50, true);

        const numLocks = (await lockerInstance.getLockProductCount()).toNumber();

        const product = await lockerInstance.lockProducts(numLocks - 1);

        // each product should be a 4 element array
        assert.isArray(product);
        assert(product.length === 4);

        // the product should be [ perTermInterest, durationInSecs, minimumLockAmount, isActive ]:
        const [perTermInterest, durationInSecs, minimumLockAmount, isActive] = product;
        assert(perTermInterest.toNumber() === 80000);
        assert(durationInSecs.toNumber() === 120);
        assert(minimumLockAmount.toNumber() === 50);
        assert(isActive === true);
    });

    it("should allow the listing of lock products (0 offset)", async function() {
        // create lock product with 10% per term, and 120 sec lock time:
        await lockerInstance.addLockProduct(100000, 120, 75, true);

        const numLocks = (await lockerInstance.getLockProductCount()).toNumber();

        const products = await lockerInstance.getLockProducts(0);

        // getLockProducts should return a 20 element array:
        assert.isArray(products);
        assert(products.length === 20);

        const newestProduct = products[numLocks - 1];

        // each product should be a 4 element array
        assert.isArray(newestProduct);
        assert(newestProduct.length === 4);

        // the products should be [ perTermInterest, durationInSecs, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [perTermInterest, durationInSecs, minimumLockAmount, isActive] = newestProduct;
        assert(perTermInterest.toNumber() === 100000);
        assert(durationInSecs.toNumber() === 120);
        assert(minimumLockAmount.toNumber() === 75);
        assert(isActive.toNumber() === 1);
    });

    it("should allow the listing of lock products (non-zero offset)", async function() {
        const offset = 1;

        const products = await lockerInstance.getLockProducts(offset);

        // getLockProducts should return a 20 element array:
        assert.isArray(products);
        assert(products.length === 20);

        const product = products[0];

        // each product should be a 4 element array
        assert.isArray(product);
        assert(product.length === 4);

        const expectedProduct = await lockerInstance.lockProducts(offset);
        const [
            expectedPerTermInterest,
            expectedDurationInSecs,
            expectedMinimumLockAmount,
            expectedIsActive
        ] = expectedProduct;

        // the products should be [ perTermInterest, durationInSecs, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [perTermInterest, durationInSecs, minimumLockAmount, isActive] = product;
        assert(perTermInterest.toNumber() === expectedPerTermInterest.toNumber());
        assert(durationInSecs.toNumber() === expectedDurationInSecs.toNumber());
        assert(minimumLockAmount.toNumber() === expectedMinimumLockAmount.toNumber());
        assert(!!isActive.toNumber() === expectedIsActive);
    });

    it("should allow the listing of lock products when there are more than 20 products");

    it("should allow lock products to be enabled/disabled", async function() {
        const lockProductId = 0;

        const tx = await lockerInstance.setLockProductActiveState(lockProductId, false);
        testHelpers.logGasUse(this, tx, "setLockProductActiveState");

        await testHelpers.assertEvent(lockerInstance, "LockProductActiveChange", {
            lockProductId: lockProductId,
            newActiveState: false
        });

        let product = await lockerInstance.lockProducts(lockProductId);

        assert(product[3] === false);

        await lockerInstance.setLockProductActiveState(lockProductId, true);

        await testHelpers.assertEvent(lockerInstance, "LockProductActiveChange", {
            lockProductId: lockProductId,
            newActiveState: true
        });

        product = await lockerInstance.lockProducts(lockProductId);

        assert(product[3] === true);
    });

    it("should allow tokens to be locked", async function() {
        const [startingBalances, totalLockAmountBefore] = await Promise.all([
            getBalances(tokenAceInstance, [tokenHolder, lockerInstance.address, interestEarnedAddress]),
            tokenAceInstance.totalLockedAmount()
        ]);
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        ]);
        testHelpers.logGasUse(this, lockingTransaction, "lockFunds");

        const perTermInterest = product[0].toNumber();
        const durationInSecs = product[1].toNumber();
        const interestEarned = Math.floor(amountToLock * perTermInterest / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await web3.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + durationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const [finishingBalances, totalLockAmountAfter] = await Promise.all([
            getBalances(tokenAceInstance, [tokenHolder, lockerInstance.address, interestEarnedAddress]),
            tokenAceInstance.totalLockedAmount(),

            testHelpers.assertEvent(lockerInstance, "NewLock", {
                lockOwner: tokenHolder,
                lockIndex: 0,
                amountLocked: amountToLock,
                interestEarned: interestEarned,
                lockedUntil: expectedLockedUntil,
                perTermInterest: perTermInterest,
                durationInSecs: durationInSecs,
                isActive: true
            })

            // TODO: events are emitted but can't retrieve them
            // testHelpers.assertEvent(tokenAceInstance, "Transfer", {
            //     from: tokenHolder,
            //     to: lockerInstance.address,
            //     amount: amountToLock
            // }),
            //
            // testHelpers.assertEvent(tokenAceInstance, "AugmintTransfer", {
            //     from: tokenHolder,
            //     to: lockerInstance.address,
            //     amount: amountToLock,
            //     fee: 0,
            //     narrative: "Funds locked"
            // })
        ]);

        assert(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.add(amountToLock + interestEarned).toString(),
            "totalLockedAmount should be increased by locked amount + interest"
        );

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder] - amountToLock);
        assert(
            finishingBalances[lockerInstance.address] ===
                startingBalances[lockerInstance.address] + amountToLock + interestEarned
        );
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress] - interestEarned);
    });

    it("should allow an account to see how many locks it has", async function() {
        const startingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const amountToLock = 1000;

        await tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder });

        const finishingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();

        assert(finishingNumLocks === startingNumLocks + 1);
    });

    it("should allow tokens to be unlocked", async function() {
        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);

        const amountToLock = 1000;

        // create lock product with 10% per term, and 2 sec lock time:
        let tx = await lockerInstance.addLockProduct(100000, 2, 0, true);
        testHelpers.logGasUse(this, tx, "addLoanProduct");

        const interestEarned = Math.floor(amountToLock / 10); // 10%

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        tx = await tokenAceInstance.lockFunds(lockerInstance.address, newLockProductId, amountToLock, {
            from: tokenHolder
        });
        testHelpers.logGasUse(this, tx, "lockFunds");

        await testHelpers.waitFor(2500);

        let [newestLockIndex, totalLockAmountBefore] = await Promise.all([
            lockerInstance.getLockCountForAddress(tokenHolder),
            tokenAceInstance.totalLockedAmount()
        ]);

        newestLockIndex = newestLockIndex.toNumber() - 1;

        tx = await lockerInstance.releaseFunds(tokenHolder, newestLockIndex);
        testHelpers.logGasUse(this, tx, "releaseFunds");

        const [finishingBalances, totalLockAmountAfter, , ,] = await Promise.all([
            getBalances(tokenAceInstance, [tokenHolder, lockerInstance.address, interestEarnedAddress]),
            tokenAceInstance.totalLockedAmount(),

            testHelpers.assertEvent(lockerInstance, "LockReleased", {
                lockOwner: tokenHolder,
                lockIndex: newestLockIndex
            }),

            testHelpers.assertEvent(tokenAceInstance, "AugmintTransfer", {
                from: lockerInstance.address,
                to: tokenHolder,
                amount: amountToLock + interestEarned,
                fee: 0,
                narrative: "Funds released from lock"
            }),

            testHelpers.assertEvent(tokenAceInstance, "Transfer", {
                from: lockerInstance.address,
                to: tokenHolder,
                amount: amountToLock + interestEarned
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.sub(amountToLock + interestEarned).toString(),
            "totalLockedAmount should be decreased by released amount"
        );

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder] + interestEarned);
        assert(finishingBalances[lockerInstance.address] === startingBalances[lockerInstance.address]);
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress] - interestEarned);
    });

    it("should allow an account to see it's individual locks", async function() {
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        ]);

        const expectedPerTermInterest = product[0].toNumber();
        const expectedDurationInSecs = product[1].toNumber();
        const expectedInterestEarned = Math.floor(amountToLock * expectedPerTermInterest / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await web3.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + expectedDurationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const numLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const newestLock = await lockerInstance.locks(tokenHolder, numLocks - 1);

        // each lock should be a 6 element array
        assert.isArray(newestLock);
        assert(newestLock.length === 6);

        // the locks should be [ amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive] = newestLock;
        assert(amountLocked.toNumber() === amountToLock);
        assert(interestEarned.toNumber() === expectedInterestEarned);
        assert(lockedUntil.toNumber() === expectedLockedUntil);
        assert(perTermInterest.toNumber() === expectedPerTermInterest);
        assert(durationInSecs.toNumber() === expectedDurationInSecs);
        assert(isActive === true);
    });

    it("should allow an account to see all it's locks (0 offset)", async function() {
        // NB: this test assumes that tokenHolder has less than 20 locks (when checking newestLock)

        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        ]);

        const expectedPerTermInterest = product[0].toNumber();
        const expectedDurationInSecs = product[1].toNumber();
        const expectedInterestEarned = Math.floor(amountToLock * expectedPerTermInterest / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await web3.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + expectedDurationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const numLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const locks = await lockerInstance.getLocksForAddress(tokenHolder, 0);

        // getLocksForAddress should return a 20 element array:
        assert.isArray(locks);
        assert(locks.length === 20);

        const newestLock = locks[numLocks - 1];

        // each lock should be a 6 element array
        assert.isArray(newestLock);
        assert(newestLock.length === 6);

        // the locks should be [ amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive] = newestLock;
        assert(amountLocked.toNumber() === amountToLock);
        assert(interestEarned.toNumber() === expectedInterestEarned);
        assert(lockedUntil.toNumber() === expectedLockedUntil);
        assert(perTermInterest.toNumber() === expectedPerTermInterest);
        assert(durationInSecs.toNumber() === expectedDurationInSecs);
        assert(isActive.toNumber() === 1);
    });

    it("should allow an account to see all it's locks (non-zero offset)", async function() {
        const offset = 1;

        const locks = await lockerInstance.getLocksForAddress(tokenHolder, offset);

        // getLocksForAddress should return a 20 element array:
        assert.isArray(locks);
        assert(locks.length === 20);

        const lock = locks[0];

        // each lock should be a 6 element array
        assert.isArray(lock);
        assert(lock.length === 6);

        const expectedLock = await lockerInstance.locks(tokenHolder, offset);
        const [
            expectedAmountLocked,
            expectedInterestEarned,
            expectedLockedUntil,
            expectedPerTermInterest,
            expectedDurationInSecs,
            expectedIsActive
        ] = expectedLock;

        // the locks should be [ amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive] = lock;
        assert(amountLocked.toNumber() === expectedAmountLocked.toNumber());
        assert(interestEarned.toNumber() === expectedInterestEarned.toNumber());
        assert(lockedUntil.toNumber() === expectedLockedUntil.toNumber());
        assert(perTermInterest.toNumber() === expectedPerTermInterest.toNumber());
        assert(durationInSecs.toNumber() === expectedDurationInSecs.toNumber());
        assert(!!isActive.toNumber() === expectedIsActive);
    });

    it("should allow an account to see all it's locks when it has more than 20 locks");

    it("should prevent someone from locking more tokens than they have", async function() {
        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const startingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const amountToLock = startingBalances[tokenHolder] + 1000;

        await testHelpers.expectThrow(
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const finishingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const finishingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder]);
        assert(finishingBalances[lockerInstance.address] === startingBalances[lockerInstance.address]);
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress]);

        assert(finishingNumLocks === startingNumLocks);
    });

    it("should prevent someone from depleting the interestEarnedAccount via locking", async function() {
        // create lock product with 100% per term interest:
        await lockerInstance.addLockProduct(1000000, 120, 0, true);
        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const startingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const amountToLock = startingBalances[interestEarnedAddress] + 100;

        // this is less a test for the code, a more a sanity check for the test
        // (so that the lockFunds doesn't fail due to tokenHolder having insufficient funds):
        assert(amountToLock <= startingBalances[tokenHolder]);

        await testHelpers.expectThrow(
            tokenAceInstance.lockFunds(lockerInstance.address, newLockProductId, amountToLock, { from: tokenHolder })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const finishingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const finishingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder]);
        assert(finishingBalances[lockerInstance.address] === startingBalances[lockerInstance.address]);
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress]);

        assert(finishingNumLocks === startingNumLocks);
    });

    it("should prevent someone from locking less than the minimumLockAmount", async function() {
        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const minimumLockAmount = 1000;

        // create lock product with token minimum:
        await lockerInstance.addLockProduct(100000, 2, minimumLockAmount, true);

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        // can't lock less than the minimumLockAmount:
        await testHelpers.expectThrow(
            tokenAceInstance.lockFunds(lockerInstance.address, newLockProductId, minimumLockAmount - 1, {
                from: tokenHolder
            })
        );

        const finishingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder]);
        assert(finishingBalances[lockerInstance.address] === startingBalances[lockerInstance.address]);
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress]);

        // should allow someone to lock exactly the minimum:
        await tokenAceInstance.lockFunds(lockerInstance.address, newLockProductId, minimumLockAmount, {
            from: tokenHolder
        });
    });

    it("should prevent someone from releasing a lock early", async function() {
        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        ]);

        const perTermInterest = product[0];
        const interestEarned = Math.floor(amountToLock * perTermInterest / 1000000);

        const newestLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber() - 1;

        await testHelpers.expectThrow(lockerInstance.releaseFunds(tokenHolder, newestLockIndex));

        const finishingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder] - amountToLock);
        assert(
            finishingBalances[lockerInstance.address] ===
                startingBalances[lockerInstance.address] + amountToLock + interestEarned
        );
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress] - interestEarned);
    });

    it("should prevent someone from unlocking an unlocked lock", async function() {
        const startingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);
        const amountToLock = 1000;

        // create lock product with 10% per term, and 2 sec lock time:
        await lockerInstance.addLockProduct(100000, 2, 0, true);
        const interestEarned = Math.floor(amountToLock / 10); // 10%

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        await tokenAceInstance.lockFunds(lockerInstance.address, newLockProductId, amountToLock, { from: tokenHolder });

        await testHelpers.waitFor(2500);

        const newestLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber() - 1;

        await lockerInstance.releaseFunds(tokenHolder, newestLockIndex);

        await testHelpers.expectThrow(lockerInstance.releaseFunds(tokenHolder, newestLockIndex));

        const finishingBalances = await getBalances(tokenAceInstance, [
            tokenHolder,
            lockerInstance.address,
            interestEarnedAddress
        ]);

        assert(finishingBalances[tokenHolder] === startingBalances[tokenHolder] + interestEarned);
        assert(finishingBalances[lockerInstance.address] === startingBalances[lockerInstance.address]);
        assert(finishingBalances[interestEarnedAddress] === startingBalances[interestEarnedAddress] - interestEarned);
    });

    it("should only allow whitelisted lock contract to be used", async function() {
        await lockerInstance.addLockProduct(1000000, 120, 0, true);
        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;
        await testHelpers.expectThrow(
            tokenAceInstance.lockFunds(tokenHolder, newLockProductId, 1000, { from: tokenHolder })
        );
    });

    it("should only allow the token contract to call createLock", async function() {
        await testHelpers.expectThrow(lockerInstance.createLock(0, tokenHolder, 1000, { from: tokenHolder }));
    });

    it("should track the total amount of locked tokens", async function() {
        const startingLockedTokenCount = (await tokenAceInstance.balances(lockerInstance.address)).toNumber();
        const amountToLock = 1000;

        const [product, tx] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.lockFunds(lockerInstance.address, 0, amountToLock, { from: tokenHolder })
        ]);
        testHelpers.logGasUse(this, tx, "lockFunds");

        const perTermInterest = product[0];
        const lockedInterested = Math.floor(amountToLock * perTermInterest / 1000000);

        const finishingLockedTokenCount = (await tokenAceInstance.balances(lockerInstance.address)).toNumber();

        assert(finishingLockedTokenCount === startingLockedTokenCount + amountToLock + lockedInterested);
    });
});
