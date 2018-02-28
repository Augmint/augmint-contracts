const stringifier = require("stringifier");
var gasUseLog = [];
let gasPrice = null;

module.exports = {
    stringify,
    getGasCost,
    getEvents,
    assertEvent,
    assertNoEvents,
    takeSnapshot,
    revertSnapshot,
    logGasUse,
    expectThrow,
    waitForTimeStamp,
    waitFor,

    /* CONSTANT getters */
    get ONE_ETH() {
        return 1000000000000000000;
    },
    get NULL_ACC() {
        return "0x0000000000000000000000000000000000000000";
    },
    get TOKEN_BUY() {
        return 0;
    },
    get TOKEN_SELL() {
        return 1;
    },
    get GAS_PRICE() {
        if (gasPrice === null) {
            throw new Error(
                "gasPrice is not set. testHelpers.before() must be executed before you attempt to get gasPrice"
            );
        }
        return gasPrice;
    }
};

const _stringify = stringifier({ maxDepth: 3, indent: "   " });

const gasUseLogDisabled =
    process.env.TEST_DISABLE_LOG_GAS_USE && process.env.TEST_DISABLE_LOG_GAS_USE.trim().toLowerCase() === "true";

before(async function() {
    gasPrice = await getGasPrice();
});

function stringify(values) {
    return _stringify(values);
}

function getEvents(contractInstance, eventName) {
    return new Promise((resolve, reject) => {
        contractInstance[eventName]().get((err, res) => {
            if (err) {
                return reject(err);
            }

            resolve(res);
        });
    });
}

async function getGasCost(gas) {
    return gasPrice.mul(gas);
}

async function getGasPrice() {
    // TODO: could we read gasPrice (and other global params) in a global beforeAll somehow ?
    // web3 0.x doesn't seem to have promisified fx for this
    return new Promise(function(resolve, reject) {
        web3.eth.getGasPrice((error, gasPrice) => {
            if (error) {
                reject(new Error("Can't get gasprice from web3 (getGasPrice).\n " + error));
            } else {
                resolve(gasPrice);
            }
        });
    });
}

async function assertEvent(contractInstance, eventName, expectedArgs) {
    const events = await getEvents(contractInstance, eventName);
    assert(events.length === 1, `Expected ${eventName} event wasn't received from ${contractInstance.address}`); // how to get contract name?

    const event = events[0];

    assert(event.event === eventName, `Expected ${eventName} event but got ${event.event}`);

    const eventArgs = event.args;

    const expectedArgNames = Object.keys(expectedArgs);
    const receivedArgNames = Object.keys(eventArgs);

    assert(
        expectedArgNames.length === receivedArgNames.length,
        `Expected ${eventName} event to have ${expectedArgNames.length} arguments, but it had ${
            receivedArgNames.length
        }`
    );

    const ret = {}; // we return values from event (useful when  custom validator passed for an id)
    expectedArgNames.forEach(argName => {
        assert(
            typeof event.args[argName] !== "undefined",
            `${argName} expected in ${eventName} event but it's not found`
        );

        const expectedValue = expectedArgs[argName];
        let value;
        switch (typeof expectedValue) {
        case "function":
            value = expectedValue(event.args[argName]);
            break;
        case "number":
            value =
                    typeof event.args[argName].toNumber === "function"
                        ? event.args[argName].toNumber()
                        : event.args[argName];
            break;
        case "string":
            value =
                    typeof event.args[argName].toString === "function"
                        ? event.args[argName].toString()
                        : event.args[argName];
            break;
        default:
            value = event.args[argName];
        }

        if (typeof expectedValue !== "function") {
            assert(
                value === expectedValue,
                `Event ${eventName} has ${argName} arg with a value of ${value} but expected ${expectedValue}`
            );
        }
        ret[argName] = value;
    });
    return ret;
}

async function assertNoEvents(contractInstance, eventName) {
    const events = await getEvents(contractInstance, eventName);
    assert(events.length === 0);
}

//let snapshotCount = 0;
function takeSnapshot() {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync(
            {
                method: "evm_snapshot",
                params: [],
                jsonrpc: "2.0",
                id: new Date().getTime()
            },
            function(error, res) {
                if (error) {
                    reject(new Error("Can't take snapshot with web3\n" + error));
                } else {
                    resolve(res.result);
                }
            }
        );
    });
}

function revertSnapshot(snapshotId) {
    return new Promise(function(resolve, reject) {
        web3.currentProvider.sendAsync(
            {
                method: "evm_revert",
                params: [snapshotId],
                jsonrpc: "2.0",
                id: new Date().getTime()
            },
            function(error, res) {
                if (error) {
                    // TODO: this error is not bubbling up to truffle test run :/
                    reject(new Error("Can't revert snapshot with web3. snapshotId: " + snapshotId + "\n" + error));
                } else {
                    resolve(res);
                }
            }
        );
    });
}

function logGasUse(testObj, tx, txName) {
    if (!gasUseLogDisabled) {
        gasUseLog.push([testObj.test.parent.title, testObj.test.fullTitle(), txName || "", tx.receipt.gasUsed]);
    }
}

function waitFor(durationInMs = 1000) {
    return new Promise((resolve, reject) => {
        setTimeout(() => {
            // make a transaction to force the local dev node to create a new block with
            // new timestamp:
            web3.eth.sendTransaction({ from: web3.eth.accounts[0] }, err => {
                if (err) {
                    return reject(err);
                }

                resolve();
            });
        }, durationInMs);
    });
}

async function waitForTimeStamp(UnixTimestamp) {
    await waitFor(UnixTimestamp * 1000 - Date.now());
}

function expectThrow(promise) {
    const onPrivateChain = web3.version.network === 1976 ? true : false; // set by .runprivatechain.sh (geth ...  --networkid 1976 ..)
    return promise
        .then(res => {
            if (!onPrivateChain) {
                //console.log("Received solidity tx instead of throw: \r\n", JSON.stringify(res, null, 4));
                throw new Error("Received solidity transaction when expected tx to revert");
            } // on privatechain we check gasUsed after tx sent
            return;
        })
        .catch(error => {
            // TODO: Check jump destination to destinguish between a throw
            //       and an actual invalid jump.
            const invalidJump = error.message.search("invalid JUMP") >= 0;
            // TODO: When we contract A calls contract B, and B throws, instead
            //       of an 'invalid jump', we get an 'out of gas' error. How do
            //       we distinguish this from an actual out of gas event? (The
            //       testrpc log actually show an 'invalid jump' event.)
            const outOfGas = error.message.search("out of gas") >= 0;
            const outOfGasPrivateChain =
                error.message.search("The contract code couldn't be stored, please check your gas amount.") >= 0;

            const allGasUsed = error.message.search("All gas used") >= 0; // we throw this manually after tx b/c on privatechain it doesn't throw :/
            const invalidOpcode1 =
                error.message.search("VM Exception while processing transaction: invalid opcode") >= 0;
            const invalidOpcode2 = error.message.search("VM Exception while executing eth_call: invalid opcode") >= 0; // testRpc <= v4
            const invalidOpcode3 = error.message.search("VM Exception while processing transaction: revert") >= 0; // testRpc > v4

            assert(
                invalidOpcode1 ||
                    invalidOpcode2 ||
                    invalidOpcode3 ||
                    invalidJump ||
                    outOfGas ||
                    (onPrivateChain && (outOfGasPrivateChain || allGasUsed)),
                "Expected solidity revert, got '" + error + "' instead. onPrivateChain: " + onPrivateChain
            );
            return;
        });
}

after(function() {
    // runs after all tests
    if (gasUseLogDisabled) {
        console.log("TEST_DISABLE_LOG_GAS_USE env variable is set to true. Gas use log not recorded.");
    } else {
        // console.log("full title:", this.parent.fullTitle()); // CHECK: why doesn't it work?
        console.log("===================  GAS USAGE STATS  ===================");
        console.log("Test contract,", "Test,", "Tx,", "Gas used");
        //console.log(gasUseLog);
        var sum = 0;
        for (var i = 0; i < gasUseLog.length; i++) {
            console.log(
                '"' + gasUseLog[i][0] + '", "' + gasUseLog[i][1] + '", "' + gasUseLog[i][2] + '", ' + gasUseLog[i][3]
            );
            sum += gasUseLog[i][3];
        }

        console.log("=========== Total gas usage : " + sum);
        console.log("Set TEST_DISABLE_LOG_GAS_USE env variable to true to disable gas use log recording.");
    }
});
