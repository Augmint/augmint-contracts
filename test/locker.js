/* TODO: create lockHelpers to make this test more readable and manegable */
const Locker = artifacts.require("Locker");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");

const testHelpers = require("./helpers/testHelpers.js");

const LOCK_MAX_GAS = 230000;
const RELEASE_MAX_GAS = 80000;

let tokenHolder = "";
let interestEarnedAddress = "";
let lockerInstance = null;
let augmintToken = null;
let monetarySupervisor = null;
let CHUNK_SIZE = 10;

const ltdParams = { lockDifferenceLimit: 300000, loanDifferenceLimit: 200000, allowedDifferenceAmount: 100000 };

contract("Lock", accounts => {
    before(async function() {
        tokenHolder = accounts[1];

        augmintToken = await tokenTestHelpers.augmintToken;
        monetarySupervisor = tokenTestHelpers.monetarySupervisor;

        interestEarnedAddress = tokenTestHelpers.interestEarnedAccount.address;

        lockerInstance = Locker.at(Locker.address);

        await Promise.all([
            monetarySupervisor.issueToReserve(50000),
            monetarySupervisor.setLtdParams(
                ltdParams.lockDifferenceLimit,
                ltdParams.loanDifferenceLimit,
                ltdParams.allowedDifferenceAmount
            ),

            tokenTestHelpers.withdrawFromReserve(tokenHolder, 40000),
            tokenTestHelpers.withdrawFromReserve(interestEarnedAddress, 10000)
        ]);
    });

    it("should allow lock products to be created", async function() {
        // create lock product with 5% per term, and 60 sec lock time:
        const tx = await lockerInstance.addLockProduct(50000, 60, 100, true);
        testHelpers.logGasUse(this, tx, "addLockProduct");

        await testHelpers.assertEvent(lockerInstance, "NewLockProduct", {
            lockProductId: x => x,
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

        const numLocks = await lockerInstance.getLockProductCount().then(res => res.toNumber());
        const products = await lockerInstance.getLockProducts(0, numLocks);

        // getLockProducts should return a <numLocks> element array:
        assert.isArray(products);
        assert(products.length === numLocks);

        const newestProduct = products[numLocks - 1];

        // each product should be a 5 element array
        assert.isArray(newestProduct);
        assert(newestProduct.length === 5);

        // the products should be [ perTermInterest, durationInSecs, maxLockAmount, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [perTermInterest, durationInSecs, minimumLockAmount, maxLockAmount, isActive] = newestProduct;
        assert(perTermInterest.toNumber() === 100000);
        assert(durationInSecs.toNumber() === 120);
        assert(minimumLockAmount.toNumber() === 75);
        const expMaxLockAmount = await monetarySupervisor.getMaxLockAmount(minimumLockAmount, perTermInterest);
        assert.equal(maxLockAmount.toString(), expMaxLockAmount.toString());
        assert(isActive.toNumber() === 1);
    });

    it("should allow the listing of lock products (non-zero offset)", async function() {
        const offset = 1;

        const products = await lockerInstance.getLockProducts(offset, CHUNK_SIZE);

        // getLockProducts should return a CHUNK_SIZE element array:
        assert.isArray(products);
        assert(products.length === CHUNK_SIZE);

        const product = products[0];

        // each product should be a 5 element array
        assert.isArray(product);
        assert(product.length === 5);

        const expectedProduct = await lockerInstance.lockProducts(offset);
        const [
            expectedPerTermInterest,
            expectedDurationInSecs,
            expectedMinimumLockAmount,
            expectedIsActive
        ] = expectedProduct;

        // the products should be [ perTermInterest, durationInSecs, maxLockAmount, isActive ] all
        // represented as uints (i.e. BigNumber objects in JS land):
        const [perTermInterest, durationInSecs, minimumLockAmount, maxLockAmount, isActive] = product;
        const expMaxLockAmount = await monetarySupervisor.getMaxLockAmount(minimumLockAmount, perTermInterest);

        assert(perTermInterest.toNumber() === expectedPerTermInterest.toNumber());
        assert(durationInSecs.toNumber() === expectedDurationInSecs.toNumber());
        assert(minimumLockAmount.toNumber() === expectedMinimumLockAmount.toNumber());
        assert.equal(maxLockAmount.toString(), expMaxLockAmount.toString());
        assert(!!isActive.toNumber() === expectedIsActive);
    });

    it("should allow the listing of lock products when there are more than CHUNK_SIZE products");

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
            tokenTestHelpers.getAllBalances({
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
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, {
                from: tokenHolder
            })
        ]);
        testHelpers.logGasUse(this, lockingTransaction, "transferAndNotify - lockFunds");

        const perTermInterest = product[0].toNumber();
        const durationInSecs = product[1].toNumber();
        const interestEarned = Math.ceil((amountToLock * perTermInterest) / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await global.web3v1.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + durationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const [totalLockAmountAfter, ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            testHelpers.assertEvent(lockerInstance, "NewLock", {
                lockOwner: tokenHolder,
                lockId: 0,
                amountLocked: amountToLock,
                interestEarned: interestEarned,
                lockedUntil: expectedLockedUntil,
                perTermInterest: perTermInterest,
                durationInSecs: durationInSecs
            }),

            // TODO: events are emitted but can't retrieve them
            // testHelpers.assertEvent(augmintToken, "Transfer", {
            //     from: tokenHolder,
            //     to: lockerInstance.address,
            //     amount: amountToLock
            // }),
            //
            // testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
            //     from: tokenHolder,
            //     to: lockerInstance.address,
            //     amount: amountToLock,
            //     fee: 0,
            //     narrative: "Funds locked"
            // })

            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.sub(amountToLock),
                    gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE
                },
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

    it("should not allow to lock with an inactive lockproduct", async function() {
        await lockerInstance.addLockProduct(50000, 60, 100, false);
        const newLockProductId = (await lockerInstance.getLockProductCount()) - 1;
        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(lockerInstance.address, 10000, newLockProductId, {
                from: tokenHolder
            })
        );
    });

    it("should allow an account to see how many locks it has", async function() {
        const startingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const amountToLock = 1000;

        await augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, {
            from: tokenHolder
        });

        const finishingNumLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();

        assert(finishingNumLocks === startingNumLocks + 1);
    });

    it("should allow tokens to be unlocked", async function() {
        const [startingBalances, addProdTx] = await Promise.all([
            tokenTestHelpers.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            // create lock product with 10% per term, and 1 sec lock time:
            lockerInstance.addLockProduct(100000, 1, 0, true)
        ]);
        testHelpers.logGasUse(this, addProdTx, "addLockProduct");

        const amountToLock = 1000;
        const interestEarned = Math.ceil(amountToLock / 10); // 10%
        const newLockProductId = (await lockerInstance.getLockProductCount()) - 1;

        const lockTx = await augmintToken.transferAndNotify(lockerInstance.address, amountToLock, newLockProductId, {
            from: tokenHolder
        });
        testHelpers.logGasUse(this, lockTx, "transferAndNotify - lockFunds");

        const [totalLockAmountBefore, newestLockId] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCount().then(res => res - 1)
        ]);

        const lockedUntil = (await lockerInstance.locks(newestLockId))[3].toNumber();
        await testHelpers.waitForTimeStamp(lockedUntil);

        const releaseTx = await lockerInstance.releaseFunds(newestLockId);
        testHelpers.logGasUse(this, releaseTx, "releaseFunds");

        const [totalLockAmountAfter, , , ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.add(interestEarned),
                    gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE + RELEASE_MAX_GAS * testHelpers.GAS_PRICE
                },
                lockerInstance: { ace: startingBalances.lockerInstance.ace },
                interestEarned: { ace: startingBalances.interestEarned.ace.sub(interestEarned) }
            }),

            testHelpers.assertEvent(lockerInstance, "LockReleased", {
                lockOwner: tokenHolder,
                lockId: newestLockId
            }),

            testHelpers.assertEvent(augmintToken, "AugmintTransfer", {
                from: lockerInstance.address,
                to: tokenHolder,
                amount: amountToLock + interestEarned,
                fee: 0,
                narrative: "Funds released from lock"
            }),

            testHelpers.assertEvent(augmintToken, "Transfer", {
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
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        ]);

        const expectedDurationInSecs = product[1].toNumber();

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await global.web3v1.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + expectedDurationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const numLocks = (await lockerInstance.getLockCountForAddress(tokenHolder)).toNumber();
        const newestLock = await lockerInstance.locks(numLocks - 1);

        // each lock should be a 5 element array
        assert.isArray(newestLock);
        assert.equal(newestLock.length, 5);

        // the locks should be [ amountLocked, owner, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
        const [amountLocked, owner, productId, lockedUntil, isActive] = newestLock;
        assert(owner === tokenHolder);
        assert(amountLocked.toNumber() === amountToLock);
        assert(productId.toNumber() === 0);
        assert(lockedUntil.toNumber() === expectedLockedUntil);
        assert(isActive === true);
    });

    it("should allow to list all locks (0 offset)");

    it("should allow to list all locks (non-zero offset)", async function() {
        const amountToLock = 1000;
        const [product, lockingTransaction, ,] = await Promise.all([
            lockerInstance.lockProducts(0),
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder }),
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder }),
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        ]);

        const expectedPerTermInterest = product[0].toNumber();
        const expectedDurationInSecs = product[1].toNumber();
        const expectedInterestEarned = Math.ceil((amountToLock * expectedPerTermInterest) / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await global.web3v1.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + expectedDurationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const lockCount = await lockerInstance.getLockCount();
        //const lockId1 = lockCount - 3;
        const lockId2 = lockCount - 2;
        const lockId3 = lockCount - 1;

        const offset = lockCount - 2;
        const locks = await lockerInstance.getLocks(offset, CHUNK_SIZE);

        assert.equal(locks.length, CHUNK_SIZE);

        const lock2 = locks[0];
        // the locks should be [ lockId, owner, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
        const [
            lockId,
            owner,
            amountLocked,
            interestEarned,
            lockedUntil,
            perTermInterest,
            durationInSecs,
            isActive
        ] = lock2;
        assert.equal(lockId.toNumber(), lockId2);
        assert.equal(
            "0x" + owner.toString(16).padStart(40, "0"), // leading 0s if address starts with 0
            tokenHolder
        );
        assert.equal(amountLocked.toNumber(), amountToLock);
        assert.equal(interestEarned.toNumber(), expectedInterestEarned);
        assert.isAtLeast(lockedUntil.toNumber(), expectedLockedUntil);
        assert.equal(perTermInterest.toNumber(), expectedPerTermInterest);
        assert.equal(durationInSecs.toNumber(), expectedDurationInSecs);
        assert.equal(isActive.toNumber(), 1);

        const lock3 = locks[1];
        assert.equal(lock3[0].toNumber(), lockId3);
    });

    it("should allow to list all locks when it has more than CHUNK_SIZE locks");

    it("should allow to list an account's locks (0 offset)", async function() {
        // NB: this test assumes that tokenHolder has less than CHUNK_SIZE locks (when checking newestLock)

        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product, lockingTransaction] = await Promise.all([
            lockerInstance.lockProducts(0),
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        ]);

        const expectedPerTermInterest = product[0].toNumber();
        const expectedDurationInSecs = product[1].toNumber();
        const expectedInterestEarned = Math.ceil((amountToLock * expectedPerTermInterest) / 1000000);

        // need the block to get the timestamp to check lockedUntil in NewLock event:
        const block = await global.web3v1.eth.getBlock(lockingTransaction.receipt.blockHash);
        const expectedLockedUntil = block.timestamp + expectedDurationInSecs;
        // sanity check:
        assert(expectedLockedUntil > Math.floor(Date.now() / 1000));

        const expectedLockId = (await lockerInstance.getLockCount()) - 1;
        const expectedAccountLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)) - 1;
        const accountLocks = await lockerInstance.getLocksForAddress(tokenHolder, expectedAccountLockIndex, CHUNK_SIZE);

        // getLocksForAddress should return a CHUNK_SIZE element array:
        assert.isArray(accountLocks);
        assert(accountLocks.length === CHUNK_SIZE);

        const newestLock = accountLocks[0];

        // each lock should be a 7 element array
        assert.isArray(newestLock);
        assert(newestLock.length === 7);

        // the locks should be [ owner, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
        const [
            lockId,
            amountLocked,
            interestEarned,
            lockedUntil,
            perTermInterest,
            durationInSecs,
            isActive
        ] = newestLock;
        assert(lockId.toNumber() === expectedLockId);
        assert(amountLocked.toNumber() === amountToLock);
        assert(interestEarned.toNumber() === expectedInterestEarned);
        assert(lockedUntil.toNumber() === expectedLockedUntil);
        assert(perTermInterest.toNumber() === expectedPerTermInterest);
        assert(durationInSecs.toNumber() === expectedDurationInSecs);
        assert(isActive.toNumber() === 1);
    });

    it("should allow to list an account's locks (non-zero offset)", async function() {
        const amountToLock = 1000;

        // lock funds, and get the product that was used:
        const [product] = await Promise.all([
            lockerInstance.lockProducts(0),
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        ]);

        const expectedPerTermInterest = product[0].toNumber();
        const expectedDurationInSecs = product[1].toNumber();
        const expectedInterestEarned = Math.ceil((amountToLock * expectedPerTermInterest) / 1000000);

        const expectedAccountLockIndex = (await lockerInstance.getLockCountForAddress(tokenHolder)) - 1;

        const accountLocks = await lockerInstance.getLocksForAddress(tokenHolder, expectedAccountLockIndex, CHUNK_SIZE);

        // getLocksForAddress should return a CHUNK_SIZE element array:
        assert.isArray(accountLocks);
        assert(accountLocks.length === CHUNK_SIZE);

        const lock = accountLocks[0];

        // each lock should be a 7 element array
        assert.isArray(lock);
        assert(lock.length === 7);

        const expectedLockId = (await lockerInstance.getLockCount()) - 1;

        const expectedLock = await lockerInstance.locks(expectedLockId);
        const [
            expectedAmountLocked,
            expectedOwner,
            expectedProductId,
            expectedLockedUntil,
            expectedIsActive
        ] = expectedLock;

        // the locks should be [ owner, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive ]
        const [lockId, amountLocked, interestEarned, lockedUntil, perTermInterest, durationInSecs, isActive] = lock;
        assert(lockId.toNumber() === expectedLockId);
        assert(expectedOwner === tokenHolder);
        assert(expectedProductId.toNumber() === 0);
        assert(amountLocked.toNumber() === expectedAmountLocked.toNumber());
        assert(interestEarned.toNumber() === expectedInterestEarned);
        assert(lockedUntil.toNumber() === expectedLockedUntil.toNumber());
        assert(perTermInterest.toNumber() === expectedPerTermInterest);
        assert(durationInSecs.toNumber() === expectedDurationInSecs);
        assert(!!isActive.toNumber() === expectedIsActive);
    });

    it("should allow to list an account's locks when it has more than CHUNK_SIZE locks");

    it("should prevent someone from locking more tokens than they have", async function() {
        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenTestHelpers.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);

        const amountToLock = startingBalances.tokenHolder.ace + 1000;

        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, { from: tokenHolder })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder),
            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace, gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE },
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
            tokenTestHelpers.getAllBalances({
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
            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, newLockProductId, {
                from: tokenHolder
            })
        );
        await testHelpers.assertNoEvents(lockerInstance, "NewLock");

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder),
            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: { ace: startingBalances.tokenHolder.ace, gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE },
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
            augmintToken.transferAndNotify(lockerInstance.address, minimumLockAmount - 1, newLockProductId, {
                from: tokenHolder
            })
        );
    });

    it("should allow someone to lock exactly the minimum", async function() {
        const [startingBalances, totalLockAmountBefore, startingNumLocks] = await Promise.all([
            tokenTestHelpers.getAllBalances({
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

        const tx = await augmintToken.transferAndNotify(lockerInstance.address, minimumLockAmount, newLockProductId, {
            from: tokenHolder
        });
        testHelpers.logGasUse(this, tx, "transferAndNotify - lockFunds");

        const expectedLockId = (await lockerInstance.getLockCount()) - 1;

        const eventResults = await testHelpers.assertEvent(lockerInstance, "NewLock", {
            lockOwner: tokenHolder,
            lockId: expectedLockId,
            amountLocked: minimumLockAmount,
            interestEarned: x => x,
            lockedUntil: x => x,
            perTermInterest: x => x,
            durationInSecs: x => x
        });

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            lockerInstance.getLockCountForAddress(tokenHolder),

            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.sub(minimumLockAmount),
                    gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE
                },
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
            tokenTestHelpers.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount()
        ]);

        // lock funds, and get the product that was used:
        const [product, lockFundsTx] = await Promise.all([
            lockerInstance.lockProducts(0),

            augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, {
                from: tokenHolder
            })
        ]);
        testHelpers.logGasUse(this, lockFundsTx, "transferAndNotify - lockFunds");

        const perTermInterest = product[0];
        const interestEarned = Math.ceil((amountToLock * perTermInterest) / 1000000);

        const newestLockId = (await lockerInstance.getLockCount()) - 1;

        await testHelpers.expectThrow(lockerInstance.releaseFunds(newestLockId));

        const [totalLockAmountAfter, ,] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            testHelpers.assertNoEvents(lockerInstance, "NewLock"),

            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.sub(amountToLock),
                    gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE
                },
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
            tokenTestHelpers.getAllBalances({
                tokenHolder: tokenHolder,
                lockerInstance: lockerInstance.address,
                interestEarned: interestEarnedAddress
            }),
            monetarySupervisor.totalLockedAmount(),
            lockerInstance.getLockCountForAddress(tokenHolder)
        ]);
        const amountToLock = 1000;

        // create lock product with 10% per term, and 1 sec lock time:
        await lockerInstance.addLockProduct(100000, 1, 0, true);
        const interestEarned = Math.ceil(amountToLock / 10); // 10%

        const newLockProductId = (await lockerInstance.getLockProductCount()) - 1;

        const lockFundsTx = await augmintToken.transferAndNotify(
            lockerInstance.address,
            amountToLock,
            newLockProductId,
            {
                from: tokenHolder
            }
        );
        testHelpers.logGasUse(this, lockFundsTx, "transferAndNotify - lockFunds");

        const newestLockId = (await lockerInstance.getLockCount()) - 1;

        const lockedUntil = (await lockerInstance.locks(newestLockId))[3].toNumber();
        await testHelpers.waitForTimeStamp(lockedUntil);

        const releaseTx = await lockerInstance.releaseFunds(newestLockId);
        testHelpers.logGasUse(this, releaseTx, "releaseFunds");

        await testHelpers.expectThrow(lockerInstance.releaseFunds(newestLockId));

        const [totalLockAmountAfter, finishingNumLocks] = await Promise.all([
            monetarySupervisor.totalLockedAmount(),

            lockerInstance.getLockCountForAddress(tokenHolder),

            tokenTestHelpers.assertBalances(startingBalances, {
                tokenHolder: {
                    ace: startingBalances.tokenHolder.ace.add(interestEarned),
                    gasFee: LOCK_MAX_GAS * testHelpers.GAS_PRICE + RELEASE_MAX_GAS * testHelpers.GAS_PRICE
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
        const craftedLocker = await Locker.new(accounts[0], augmintToken.address, monetarySupervisor.address);
        await craftedLocker.grantPermission(accounts[0], "StabilityBoard");
        await craftedLocker.addLockProduct(1000000, 120, 0, true);
        const newLockProductId = (await craftedLocker.getLockProductCount()).toNumber() - 1;
        await testHelpers.expectThrow(
            augmintToken.transferAndNotify(craftedLocker.address, 10000, newLockProductId, {
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
        assert((await augmintToken.balanceOf(interestEarnedAddress)).gte(interestAmount));
        await testHelpers.expectThrow(monetarySupervisor.requestInterest(1000, interestAmount, { from: accounts[0] }));
    });

    it("only allowed contract should call releaseFundsNotification ", async function() {
        const amountToLock = 10000;
        const lockFundsTx = await augmintToken.transferAndNotify(lockerInstance.address, amountToLock, 0, {
            from: tokenHolder
        });
        testHelpers.logGasUse(this, lockFundsTx, "transferAndNotify - lockFunds");

        await testHelpers.expectThrow(monetarySupervisor.releaseFundsNotification(amountToLock, { from: accounts[0] }));
    });

    it("Should allow to change  monetarySupervisor contract", async function() {
        const newMonetarySupervisor = monetarySupervisor.address;
        const tx = await lockerInstance.setMonetarySupervisor(newMonetarySupervisor);
        testHelpers.logGasUse(this, tx, "setSystemContracts");

        const [actualMonetarySupervisor] = await Promise.all([
            lockerInstance.monetarySupervisor(),
            testHelpers.assertEvent(lockerInstance, "MonetarySupervisorChanged", { newMonetarySupervisor })
        ]);

        assert.equal(actualMonetarySupervisor, newMonetarySupervisor);
    });

    it("Only allowed should change rates and monetarySupervisor contracts", async function() {
        const newMonetarySupervisor = monetarySupervisor.address;
        await testHelpers.expectThrow(
            lockerInstance.setMonetarySupervisor(newMonetarySupervisor, { from: accounts[1] })
        );
    });
});
