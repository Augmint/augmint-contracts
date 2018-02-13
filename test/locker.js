/* TODO: create lockHelpers to make this test more readable and manegable */
const Locker = artifacts.require("Locker");

const tokenAceTestHelper = require("./helpers/tokenAceTestHelper.js");
const monetarySupervisorTestHelpers = require("./helpers/monetarySupervisorTestHelpers.js");
const testHelpers = require("./helpers/testHelper.js");

const MAX_LOCK_GAS = web3.toWei(0.028); // TODO: use gas cost and calculate wei fee
const MAX_RELEASE_GAS = web3.toWei(0.001);

let tokenHolder = "";
let interestEarnedAddress = "";
let lockerInstance = null;
let tokenAceInstance = null;
let monetarySupervisor = null;

contract("Lock", accounts => {
    before(async function() {
        const superUserAddress = accounts[0];
        tokenHolder = accounts[1];

        tokenAceInstance = await tokenAceTestHelper.newTokenAceMock(superUserAddress);

        monetarySupervisor = await monetarySupervisorTestHelpers.newMonetarySupervisorMock(tokenAceInstance);

        lockerInstance = await Locker.new(tokenAceInstance.address, monetarySupervisor.address);

        [interestEarnedAddress, , , ,] = await Promise.all([
            monetarySupervisor.interestEarnedAccount(),

            tokenAceInstance.grantMultiplePermissions(lockerInstance.address, ["NoFeeTransferContracts"]),
            monetarySupervisor.grantMultiplePermissions(lockerInstance.address, ["LockerContracts"]),

            monetarySupervisor.issueToReserve(50000),
            lockerInstance.addLockProduct(50000, 60, 100, true) // to be used in tests to make unit test independent
        ]);

        await Promise.all([
            monetarySupervisorTestHelpers.withdrawFromReserve(tokenHolder, 40000),
            monetarySupervisorTestHelpers.withdrawFromReserve(interestEarnedAddress, 10000)
        ]);
    });

    it("should allow lock products to be created", async function() {
        // create lock product with 5% per term, and 60 sec lock time:
        const tx = await lockerInstance.addLockProduct(50000, 60, 100, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

        await testHelpers.assertEvent(lockerInstance, "NewLockProduct", {
            lockProductId: 1, // before created on for to be used with rest of the tests
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
        const tx = await lockerInstance.addLockProduct(80000, 120, 50, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

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
        const tx = await lockerInstance.addLockProduct(100000, 120, 75, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

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
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount()
        ]);
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, {
                from: tokenHolder
            })
        ]);
        testHelpers.logGasUse(this, lockingTransaction, "transferAndNotify - lockFunds");

        const perTermInterest = product[0].toNumber();
        const durationInSecs = product[1].toNumber();
        const interestEarned = Math.floor(amountToLock * perTermInterest / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await web3.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + durationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const [totalLockAmountAfter, ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            testHelpers.assertEvent(lockerInstance, "NewLock", {
                lockOwner: tokenHolder,
                lockIndex: 0,
                amountLocked: amountToLock,
                interestEarned: interestEarned,
                lockedUntil: expectedLockedUntil,
                perTermInterest: perTermInterest,
                durationInSecs: durationInSecs,
                isActive: true
            }),

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

            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace.sub(amountToLock), gasFee: MAX_LOCK_GAS },
                lockerInstance: { ace: startingBalances.lockerInstance.ace.add(amountToLock + interestEarned) },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(interestEarned) }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.add(amountToLock).toString(),
            "totalLockedAmount should be increased by locked amount "
        );
    });

    it("should allow an account to see how many locks it has", async function() {
        const startingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const amountToLock = 1000;

        await tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, {
            from: tokenHolder
        });

        const finishingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();

        assert(finishingNumLocks === startingNumLocks + 1);
    });

    it("should allow tokens to be unlocked", async function() {
        const [startingBalances, addProdTx] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            // create lock product with 10% per term, and 2 sec lock time:
            lockerInstance.addLockProduct(100000, 2, 0, true)
        ]);
        testHelpers.logGasUse(this, addProdTx, "addLockProduct");

        const amountToLock = 1000;
        const interestEarned = Math.floor(amountToLock / 10); // 10%
        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        const lockTx = await tokenAceInstance.transferAndNotify(
            lockerInstance.address,
            amountToLock,
            newLockProductId,
            {
                from: tokenHolder
            }
        );
        testHelpers.logGasUse(this, lockTx, "transferAndNotify - lockFunds");

        await testHelpers.waitFor(2500);

        let [newestLockIndex, totalLockAmountBefore] = await Promise.all([
            lockerInstance.getLockCountForAddress(tokenHolder),
            monetarySupervisor.totalLockedAmount()
        ]);

        newestLockIndex = newestLockIndex.toNumber() - 1;

        const releaseTx = await lockerInstance.releaseFunds(tokenHolder, newestLockIndex);
        testHelpers.logGasUse(this, releaseTx, "releaseFunds");

        const [totalLockAmountAfter, , , ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.add(interestEarned),
                    gasFee: MAX_LOCK_GAS + MAX_RELEASE_GAS
                },
                lockerInstance: { ace: startingBalances.lockerInstance.ace },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(interestEarned) }
            }),

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
            totalLockAmountBefore.sub(amountToLock).toString(),
            "totalLockedAmount should be the decrased by released amount (w/o interest) after release "
        );
    });

    it("should allow an account to see it's individual locks", async function() {
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
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
            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
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
        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);

        const amountToLock = startingBalances.tokenHolder.ace + 1000;

        await testHelpers.expectThrow(
            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder),
            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace, gasFee: MAX_LOCK_GAS },
                lockerInstance: { ace: startingBalances.lockerInstance.ace },
                interestEarned: { ace: startingBalances.interestEarned.ace }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.toString(),
            "totalLockedAmount shouldn't change"
        );

        assert.equal(finishingNumLocks.toNumber(), startingNumLocks.toNumber(), "number of locks shouldn't change");
    });

    it("should prevent someone from depleting the interestEarnedAccount via locking", async function() {
        // create lock product with 100% per term interest:
        await lockerInstance.addLockProduct(1000000, 120, 0, true);
        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);

        const amountToLock = startingBalances.interestEarned.ace.add(1);

        // this is less a test for the code, a more a sanity check for the test
        // (so that the lockFunds doesn't fail due to tokenHolder having insufficient funds):

        assert(startingBalances.tokenHolder.ace.gte(amountToLock));

        await testHelpers.expectThrow(
            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, newLockProductId, {
                from: tokenHolder
            })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder),
            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace, gasFee: MAX_LOCK_GAS },
                lockerInstance: { ace: startingBalances.lockerInstance.ace },
                interestEarned: { ace: startingBalances.interestEarned.ace }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.toString(),
            "totalLockedAmount shouldn't change"
        );

        assert.equal(finishingNumLocks.toNumber(), startingNumLocks.toNumber(), "number of locks shouldn't change");
    });

    it("should prevent someone from locking less than the minimumLockAmount", async function() {
        const minimumLockAmount = 1000;

        // create lock product with token minimum:
        await lockerInstance.addLockProduct(100000, 2, minimumLockAmount, true);

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        // can't lock less than the minimumLockAmount:
        await testHelpers.expectThrow(
            tokenAceInstance.transferAndNotify(lockerInstance.address, minimumLockAmount - 1, newLockProductId, {
                from: tokenHolder
            })
        );
    });

    it("should allow someone to lock exactly the minimum", async function() {
        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);

        const minimumLockAmount = 1000;

        await lockerInstance.addLockProduct(100000, 2, minimumLockAmount, true);

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        const tx = await tokenAceInstance.transferAndNotify(
            lockerInstance.address,
            minimumLockAmount,
            newLockProductId,
            {
                from: tokenHolder
            }
        );
        testHelpers.logGasUse(this, tx, "transferAndNotify - lockFunds");

        const eventResults = await testHelpers.assertEvent(lockerInstance, "NewLock", {
            lockOwner: tokenHolder,
            lockIndex: x => x,
            amountLocked: minimumLockAmount,
            interestEarned: x => x,
            lockedUntil: x => x,
            perTermInterest: x => x,
            durationInSecs: x => x,
            isActive: true
        });

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            lockerInstance.getLockCountForAddress(tokenHolder),

            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace.sub(minimumLockAmount), gasFee: MAX_LOCK_GAS },
                lockerInstance: {
                    ace: startingBalances.lockerInstance.ace.add(minimumLockAmount).add(eventResults.interestEarned)
                },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(eventResults.interestEarned) }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.add(minimumLockAmount).toString(),
            "totalLockedAmount should be increased by locked amount "
        );

        assert.equal(finishingNumLocks.toNumber(), startingNumLocks.toNumber() + 1, "number of locks should be +1");
    });

    it("should prevent someone from releasing a lock early", async function() {
        const amountToLock = 1000;
        const [startingBalances, totalLockAmountBefore] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount()
        ]);

        // lock funds, and get the product that was used:
        const [product] = await Promise.all([
            lockerInstance.lockProducts(0),

            tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, {
                from: tokenHolder
            })
        ]);

        const perTermInterest = product[0];
        const interestEarned = Math.floor(amountToLock * perTermInterest / 1000000);

        const newestLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber() - 1;

        await testHelpers.expectThrow(lockerInstance.releaseFunds(tokenHolder, newestLockIndex));

        const [totalLockAmountAfter, ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            testHelpers.assertNoEvents(lockerInstance, "NewLock"),

            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace.sub(amountToLock), gasFee: MAX_LOCK_GAS },
                lockerInstance: { ace: startingBalances.lockerInstance.ace.add(amountToLock + interestEarned) },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(interestEarned) }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.add(amountToLock).toString(),
            "totalLockedAmount should be increased by locked amount "
        );
    });

    it("should prevent someone from unlocking an unlocked lock", async function() {
        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenAceTestHelper.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);
        const amountToLock = 1000;

        // create lock product with 10% per term, and 2 sec lock time:
        await lockerInstance.addLockProduct(100000, 2, 0, true);
        const interestEarned = Math.floor(amountToLock / 10); // 10%

        const newLockProductId = (await lockerInstance.getLockProductCount()).toNumber() - 1;

        await tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, newLockProductId, {
            from: tokenHolder
        });

        await testHelpers.waitFor(2500);

        const newestLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber() - 1;

        await lockerInstance.releaseFunds(tokenHolder, newestLockIndex);

        await testHelpers.expectThrow(lockerInstance.releaseFunds(tokenHolder, newestLockIndex));

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            lockerInstance.getLockCountForAddress(tokenHolder),

            tokenAceTestHelper.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.add(interestEarned),
                    gasFee: MAX_LOCK_GAS + MAX_RELEASE_GAS
                },
                lockerInstance: {
                    ace: startingBalances.lockerInstance.ace
                },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(interestEarned) }
            })
        ]);

        assert.equal(
            totalLockAmountAfter.toString(),
            totalLockAmountBefore.toString(),
            "totalLockedAmount should be the same after release"
        );

        assert.equal(
            finishingNumLocks.toNumber(),
            startingNumLocks.toNumber() + 1,
            "number of locks should be +1 after lock & release"
        );
    });

    it("should only allow whitelisted lock contract to be used", async function() {
        const craftedLocker = await Locker.new(tokenAceInstance.address, monetarySupervisor.address);
        await craftedLocker.addLockProduct(1000000, 120, 0, true);
        const newLockProductId = (await craftedLocker.getLockProductCount()).toNumber() - 1;
        await testHelpers.expectThrow(
            tokenAceInstance.transferAndNotify(craftedLocker.address, 10000, newLockProductId, {
                from: tokenHolder
            })
        );
    });

    it("should only allow the token contract to call transferNotification", async function() {
        await testHelpers.expectThrow(lockerInstance.transferNotification(accounts[0], 1000, 0, { from: accounts[0] }));
    });

    it("only allowed contract should call requestInterest ", async function() {
        const interestAmount = 100;
        // make sure it's not reverting b/c not enough interest
        assert((await tokenAceInstance.balanceOf(interestEarnedAddress)).gte(interestAmount));
        await testHelpers.expectThrow(monetarySupervisor.requestInterest(1000, interestAmount, { from: accounts[0] }));
    });

    it("only allowed contract should call releaseFundsNotification ", async function() {
        const amountToLock = 10000;
        await tokenAceInstance.transferAndNotify(lockerInstance.address, amountToLock, 0, {
            from: tokenHolder
        });
        await testHelpers.expectThrow(monetarySupervisor.releaseFundsNotification(amountToLock, { from: accounts[0] }));
    });
});
