const StabilityBoardProxy = artifacts.require("./StabilityBoardProxy.sol");
const SB_addSigners = artifacts.require("scriptTests/SB_addSigners.sol");
const SB_addAndRemoveSigners = artifacts.require("scriptTests/SB_addAndRemoveSigners.sol");
const SB_removeSigners = artifacts.require("scriptTests/SB_removeSigners.sol");
const SB_revertingScript = artifacts.require("scriptTests/SB_revertingScript.sol");
const SB_outOfGasScript = artifacts.require("scriptTests/SB_outOfGasScript.sol");
const SB_cancelScript = artifacts.require("scriptTests/SB_cancelScript.sol");
const testHelpers = require("./helpers/testHelpers.js");

let snapshotId;
let stabilityBoardProxy;
let stabilityBoardProxyWeb3Contract;
const scriptState = { New: 0, Approved: 1, Done: 2, Cancelled: 3, Failed: 4 };
const CHUNK_SIZE = 10;

async function addSigners(newSigners) {
    // assuming allSigners are active
    const [addSignerScript, currentSigners] = await Promise.all([
        SB_addSigners.new(newSigners),
        stabilityBoardProxy.getSigners(0, CHUNK_SIZE)
    ]);

    const signTxs = currentSigners.filter(signerTuple => !signerTuple[1].eq(0)).map(tuple => {
        const signerAddress = "0x" + tuple[1].toString(16).padStart(40, "0");
        return stabilityBoardProxy.sign(addSignerScript.address, { from: signerAddress });
    });

    const signCount = Math.floor(signTxs.length / 2) + 1;
    await Promise.all(signTxs.slice(0, signCount));

    const executeTx = await stabilityBoardProxy.execute(addSignerScript.address);
    return executeTx;
}

contract("StabilityBoardProxy", accounts => {
    before(async () => {
        stabilityBoardProxy = StabilityBoardProxy.at(StabilityBoardProxy.address);
        stabilityBoardProxyWeb3Contract = new global.web3v1.eth.Contract(
            StabilityBoardProxy.abi,
            StabilityBoardProxy.address
        );
    });

    beforeEach(async function() {
        snapshotId = await testHelpers.takeSnapshot();
    });

    afterEach(async function() {
        await testHelpers.revertSnapshot(snapshotId);
    });

    it("only signer should sign", async function() {
        testHelpers.expectThrow(
            stabilityBoardProxy.sign("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { from: accounts[1] })
        );
    });

    it("signer should be able to sign", async function() {
        const scriptAddress = "0x0000000000000000000000000000000000000001";
        const tx = await stabilityBoardProxy.sign(scriptAddress);
        testHelpers.logGasUse(this, tx, "multiSig.sign");

        const [script] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(scriptAddress).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptSigned", { signer: accounts[0], scriptAddress }),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptApproved", { scriptAddress })
        ]);
        assert.equal(script.signCount, 1);
        assert.equal(script.state, scriptState.Approved);
    });

    it("should not sign twice", async function() {
        const scriptAddress = "0x0000000000000000000000000000000000000002";
        const tx = await stabilityBoardProxy.sign(scriptAddress);
        testHelpers.logGasUse(this, tx, "multiSig.sign");

        await testHelpers.assertEvent(stabilityBoardProxy, "ScriptSigned", { signer: accounts[0], scriptAddress });

        await testHelpers.expectThrow(stabilityBoardProxy.sign(scriptAddress, { from: accounts[0] }));
    });

    it("should add then disable signers and should not cancel or execute in Done state", async function() {
        const newSigners = [accounts[1], accounts[2]];

        const [allSignersCountBefore, activeSignersCountBefore] = await Promise.all([
            stabilityBoardProxy.getAllSignersCount().then(res => res.toNumber()),
            stabilityBoardProxy.activeSignersCount().then(res => res.toNumber())
        ]);

        const addSignerScript = await SB_addSigners.new(newSigners);

        const signTx = await stabilityBoardProxy.sign(addSignerScript.address);
        testHelpers.logGasUse(this, signTx, "multiSig.sign");

        const executeAddTx = await stabilityBoardProxy.execute(addSignerScript.address);
        testHelpers.logGasUse(this, executeAddTx, "multiSig.execute - add 2 signers");

        let [allSignersCountAfter, activeSignersCountAfter, signersAfter, script] = await Promise.all([
            stabilityBoardProxy.getAllSignersCount(),
            stabilityBoardProxy.activeSignersCount(),
            stabilityBoardProxy.getSigners(0, CHUNK_SIZE),
            stabilityBoardProxyWeb3Contract.methods.scripts(addSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "SignerAdded", [
                { signer: newSigners[0] },
                { signer: newSigners[1] }
            ]),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: addSignerScript.address,
                result: true
            })
        ]);

        assert.equal(script.state, scriptState.Done);
        assert.equal(signersAfter[0][2].toNumber(), 1, "signer 0 should be active");
        assert.equal(signersAfter[1][2].toNumber(), 1, "signer 1 should be active");
        assert.equal(signersAfter[2][2].toNumber(), 1, "signer 2 should be active");
        assert.equal(signersAfter[3], undefined, "signer 3 should not exist");
        assert.equal(activeSignersCountAfter.toNumber(), activeSignersCountBefore + newSigners.length);
        assert.equal(allSignersCountAfter.toNumber(), allSignersCountBefore + newSigners.length);

        // REMOVE
        const removeSignerScript = await SB_removeSigners.new(newSigners);

        const [signTx1, signTx2] = await Promise.all([
            await stabilityBoardProxy.sign(removeSignerScript.address, { from: newSigners[0] }),
            await stabilityBoardProxy.sign(removeSignerScript.address, { from: newSigners[1] })
        ]);
        testHelpers.logGasUse(this, signTx1, "multiSig.sign");
        testHelpers.logGasUse(this, signTx2, "multiSig.sign");

        const executeRemoveTx = await stabilityBoardProxy.execute(removeSignerScript.address);
        testHelpers.logGasUse(this, executeRemoveTx, "multiSig.execute - remove 2 signers");

        [activeSignersCountAfter, signersAfter, script] = await Promise.all([
            stabilityBoardProxy.activeSignersCount(),
            stabilityBoardProxy.getSigners(0, CHUNK_SIZE),
            stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "SignerRemoved", [
                { signer: newSigners[0] },
                { signer: newSigners[1] }
            ]),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: removeSignerScript.address,
                result: true
            })
        ]);

        assert.equal(script.state, scriptState.Done);
        assert.equal(signersAfter[0][2].toNumber(), 1, "signer 0 should be active");
        assert.equal(signersAfter[1][2].toNumber(), 0, "signer 1 should be inactive");
        assert.equal(signersAfter[2][2].toNumber(), 0, "signer 2 should be inactive");
        assert.equal(signersAfter[3], undefined, "signer 3 should not exist");
        assert.equal(activeSignersCountAfter.toNumber(), activeSignersCountBefore);
        assert.equal(allSignersCountAfter.toNumber(), allSignersCountBefore + newSigners.length);

        // try to execute again
        await testHelpers.expectThrow(stabilityBoardProxy.execute(removeSignerScript.address));

        // try to cancel: create, sign & execute a script to try to cancel our already Done removeSignerScript
        const cancelScript = await SB_cancelScript.new(removeSignerScript.address);
        await stabilityBoardProxy.sign(cancelScript.address);

        await stabilityBoardProxy.execute(cancelScript.address);
        const [script2After] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(cancelScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: cancelScript.address,
                result: false
            })
        ]);
        assert(script2After.state, scriptState.Failed);
    });

    it("should add then disable signers in same script", async function() {
        const expNewSigners = [accounts[1], accounts[2]];

        const [allSignersCountBefore, activeSignersCountBefore] = await Promise.all([
            stabilityBoardProxy.getAllSignersCount().then(res => res.toNumber()),
            stabilityBoardProxy.activeSignersCount().then(res => res.toNumber())
        ]);

        const addSignerScript = await SB_addAndRemoveSigners.new();

        const signTx = await stabilityBoardProxy.sign(addSignerScript.address);
        testHelpers.logGasUse(this, signTx, "multiSig.sign");

        const executeAddTx = await stabilityBoardProxy.execute(addSignerScript.address);
        testHelpers.logGasUse(this, executeAddTx, "multiSig.execute - add 2, remove 1 signers");

        let [allSignersCountAfter, activeSignersCountAfter, signersAfter, script] = await Promise.all([
            stabilityBoardProxy.getAllSignersCount(),
            stabilityBoardProxy.activeSignersCount(),
            stabilityBoardProxy.getSigners(0, CHUNK_SIZE),
            stabilityBoardProxyWeb3Contract.methods.scripts(addSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "SignerAdded", [
                { signer: expNewSigners[0] },
                { signer: expNewSigners[1] }
            ]),
            testHelpers.assertEvent(stabilityBoardProxy, "SignerRemoved", { signer: accounts[0] }),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: addSignerScript.address,
                result: true
            })
        ]);

        assert.equal(script.state, scriptState.Done);
        assert.equal(signersAfter[0][2].toNumber(), 0, "signer 0 should be inactive");
        assert.equal(signersAfter[1][2].toNumber(), 1, "signer 1 should be active");
        assert.equal(signersAfter[2][2].toNumber(), 1, "signer 2 should be active");
        assert.equal(signersAfter[3], undefined, "signer 3 should not exist");
        assert.equal(activeSignersCountAfter.toNumber(), activeSignersCountBefore + expNewSigners.length - 1);
        assert.equal(allSignersCountAfter.toNumber(), allSignersCountBefore + expNewSigners.length);
    });

    it("should not add 0x0 signer", async function() {
        const newSigners = [accounts[1], "0x0"];
        await addSigners(newSigners);
        await testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
            scriptAddress: res => res,
            result: false
        });

        const activeSignersCountAfter = await stabilityBoardProxy.activeSignersCount();
        assert.equal(activeSignersCountAfter.toNumber(), 1);
    });

    it("should not remove all signers", async function() {
        const removeSignerScript = await SB_removeSigners.new([accounts[0]]);

        const signTx = await stabilityBoardProxy.sign(removeSignerScript.address, { from: accounts[0] });

        testHelpers.logGasUse(this, signTx, "multiSig.sign");

        await stabilityBoardProxy.execute(removeSignerScript.address);

        await testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
            scriptAddress: removeSignerScript.address,
            result: false
        });

        const activeSignersCountAfter = await stabilityBoardProxy.activeSignersCount();
        assert.equal(activeSignersCountAfter.toNumber(), 1);
    });

    it("should not execute when script is New state (no quorum)", async function() {
        const newSigners = [accounts[1]];
        await addSigners(newSigners);

        const removeSignerScript = await SB_removeSigners.new(newSigners);

        const signTx1 = await stabilityBoardProxy.sign(removeSignerScript.address, { from: newSigners[0] });
        testHelpers.logGasUse(this, signTx1, "multiSig.sign");
        const script = await stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call();

        assert.equal(script.state, scriptState.New);

        await testHelpers.expectThrow(stabilityBoardProxy.execute(removeSignerScript.address, { from: accounts[0] }));
    });

    it("should accept signatures after quorum reached", async function() {
        const newSigners = [accounts[1], accounts[2]];
        await addSigners(newSigners);

        const removeSignerScript = await SB_removeSigners.new(newSigners);

        await Promise.all(
            newSigners.map(signer =>
                stabilityBoardProxy
                    .sign(removeSignerScript.address, { from: signer })
                    .then(tx => testHelpers.logGasUse(this, tx, "multiSig.sign"))
            )
        );

        const scriptBefore = await stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call();
        assert.equal(scriptBefore.state, scriptState.Approved);

        const signTx = await stabilityBoardProxy.sign(removeSignerScript.address, { from: accounts[0] });
        testHelpers.logGasUse(this, signTx, "multiSig.sign");

        const scriptAfter = await stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call();
        assert.equal(scriptAfter.state, scriptState.Approved);
        assert.equal(scriptAfter.signCount, newSigners.length + 1);
    });

    it("should cancel a script in New state", async function() {
        const newSigners = [accounts[1]];
        await addSigners(newSigners);

        // Create a script to be cancelled (w/ one approval from 2 signers)
        const removeSignerScript = await SB_removeSigners.new(newSigners);
        await stabilityBoardProxy.sign(removeSignerScript.address);
        const scriptBefore = await stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call();
        assert.equal(scriptBefore.state, scriptState.New);

        // create , sign & execute a script to cancel our removeSignerScript
        const cancelScript = await SB_cancelScript.new(removeSignerScript.address);
        await Promise.all(
            [...newSigners, accounts[0]].map(signer =>
                stabilityBoardProxy.sign(cancelScript.address, { from: signer })
            )
        );

        const cancelTx = await stabilityBoardProxy.execute(cancelScript.address, { from: accounts[0] });
        testHelpers.logGasUse(this, cancelTx, "multiSig.execute cancelScript");

        const [scriptAfter] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptCancelled", {
                scriptAddress: removeSignerScript.address
            })
        ]);
        assert.equal(scriptAfter.state, scriptState.Cancelled);
    });

    it("should cancel an Approved script then should not cancel or execute in Cancelled state", async function() {
        // Create and apprive script to be cancelled
        const removeSignerScript = await SB_removeSigners.new([accounts[0]]);
        await stabilityBoardProxy.sign(removeSignerScript.address);
        const scriptBefore = await stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call();
        assert.equal(scriptBefore.state, scriptState.Approved);

        // create, sign & execute a script to cancel our removeSignerScript
        const cancelScript = await SB_cancelScript.new(removeSignerScript.address);
        await stabilityBoardProxy.sign(cancelScript.address);

        const cancelTx = await stabilityBoardProxy.execute(cancelScript.address);
        testHelpers.logGasUse(this, cancelTx, "multiSig.execute cancelScript");

        const [scriptAfter] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(removeSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptCancelled", {
                scriptAddress: removeSignerScript.address
            })
        ]);
        assert.equal(scriptAfter.state, scriptState.Cancelled);

        // try to execute again
        await testHelpers.expectThrow(stabilityBoardProxy.execute(removeSignerScript.address));

        // try to cancel: create, sign & execute a script to try to cancel our already Cancelled removeSignerScript
        const cancelScript2 = await SB_cancelScript.new(removeSignerScript.address);
        await stabilityBoardProxy.sign(cancelScript2.address);

        await stabilityBoardProxy.execute(cancelScript2.address);
        const [script2After] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(cancelScript2.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: cancelScript2.address,
                result: false
            })
        ]);
        assert(script2After.state, scriptState.Failed);
    });

    it("should set script state to Failed if script fails & should not cancel or execute in Failed state", async function() {
        const revertingScript = await SB_revertingScript.new();
        await stabilityBoardProxy.sign(revertingScript.address);

        const tx = await stabilityBoardProxy.execute(revertingScript.address);
        testHelpers.logGasUse(this, tx, "multiSig.execute - revertingScript");

        const [signersCountAfter, script] = await Promise.all([
            stabilityBoardProxy.activeSignersCount(),
            stabilityBoardProxyWeb3Contract.methods.scripts(revertingScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: revertingScript.address,
                result: false
            })
        ]);

        assert.equal(signersCountAfter.toNumber(), 1);
        assert.equal(script.state, scriptState.Failed);

        // try to execute again
        await testHelpers.expectThrow(stabilityBoardProxy.execute(revertingScript.address));

        // try to cancel: create, sign & execute a script to try to cancel our already Cancelled removeSignerScript
        const revertingScript2 = await SB_revertingScript.new(revertingScript.address);
        await stabilityBoardProxy.sign(revertingScript2.address);

        await stabilityBoardProxy.execute(revertingScript2.address);
        const [script2After] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(revertingScript2.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: revertingScript2.address,
                result: false
            })
        ]);
        assert(script2After.state, scriptState.Failed);
    });

    it("should set script state to Failed if script runs out of gas", async function() {
        const outOfGasScript = await SB_outOfGasScript.new();
        await stabilityBoardProxy.sign(outOfGasScript.address);
        const tx = await stabilityBoardProxy.execute(outOfGasScript.address, { gas: 200000 });
        testHelpers.logGasUse(this, tx, "multiSig.execute - outOfGasScript");

        const [script] = await Promise.all([
            stabilityBoardProxyWeb3Contract.methods.scripts(outOfGasScript.address).call(),
            testHelpers.assertEvent(stabilityBoardProxy, "ScriptExecuted", {
                scriptAddress: outOfGasScript.address,
                result: false
            })
        ]);

        assert.equal(script.state, scriptState.Failed);
    });

    it("Should list scripts", async function() {
        const [scriptCountBefore, approvedScript, revertingScript, doneScript] = await Promise.all([
            stabilityBoardProxy.getScriptsCount().then(res => res.toNumber()),
            SB_addSigners.new([accounts[1]]),
            SB_revertingScript.new(),
            SB_addSigners.new([accounts[1]])
        ]);

        // need to do it in sequence for deterministic order
        await stabilityBoardProxy.sign(approvedScript.address);
        await stabilityBoardProxy.sign(revertingScript.address);
        await stabilityBoardProxy.sign(doneScript.address);

        await Promise.all([
            stabilityBoardProxy.execute(revertingScript.address),
            stabilityBoardProxy.execute(doneScript.address)
        ]);

        const [scriptsCountAfter, scriptsArray] = await Promise.all([
            stabilityBoardProxy.getScriptsCount().then(res => res.toNumber()),
            stabilityBoardProxy.getScripts(scriptCountBefore, CHUNK_SIZE)
        ]);
        const scripts = scriptsArray.filter(item => !item[1].eq(0)).map(item => {
            return {
                index: item[0].toNumber(),
                address: "0x" + item[1].toString(16).padStart(40, "0"),
                state: item[2].toNumber(),
                signCount: item[3].toNumber()
            };
        });

        assert.equal(scripts.length, 3);
        assert.equal(scriptsCountAfter, scriptCountBefore + 3);
        assert.equal(scripts[0].state, scriptState.Approved);
        assert.equal(scripts[0].address, approvedScript.address);
        assert.equal(scripts[0].signCount, 1);
        assert.equal(scripts[1].state, scriptState.Failed);
        assert.equal(scripts[1].address, revertingScript.address);
        assert.equal(scripts[1].signCount, 1);
        assert.equal(scripts[2].state, scriptState.Done);
        assert.equal(scripts[2].address, doneScript.address);
        assert.equal(scripts[2].signCount, 1);
    });

    it("only a signer should execute an Approved script", async function() {
        const addSignerScript = await SB_addSigners.new([accounts[1]]);
        await stabilityBoardProxy.sign(addSignerScript.address);

        await testHelpers.expectThrow(stabilityBoardProxy.execute(addSignerScript.address, { from: accounts[1] }));
    });

    it("should not call cancelScript directly", async function() {
        const addSignerScript = await SB_addSigners.new([accounts[1]]);
        await stabilityBoardProxy.sign(addSignerScript.address);

        await testHelpers.expectThrow(stabilityBoardProxy.cancelScript(addSignerScript.address));
    });

    it("should not call addSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardProxy.addSigners([accounts[0]]));
    });

    it("should not call removeSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardProxy.removeSigners([accounts[0]]));
    });
});
