const StabilityBoardSigner = artifacts.require("./StabilityBoardSigner.sol");
const SB_addSigners = artifacts.require("scriptTests/SB_addSigners.sol");
const SB_removeSigners = artifacts.require("scriptTests/SB_removeSigners.sol");
const SB_revertingScript = artifacts.require("scriptTests/SB_revertingScript.sol");
const SB_outOfGasScript = artifacts.require("scriptTests/SB_outOfGasScript.sol");
const testHelpers = require("./helpers/testHelpers.js");

let stabilityBoardSigner;
let stabilityBoardSignerWeb3Contract;
const scriptState = { New: 0, Approved: 1, Done: 2, Cancelled: 3, Failed: 4 };

contract("StabilityBoardSigner", accounts => {
    before(async () => {
        stabilityBoardSigner = StabilityBoardSigner.at(StabilityBoardSigner.address);
        stabilityBoardSignerWeb3Contract = new global.web3v1.eth.Contract(
            StabilityBoardSigner.abi,
            StabilityBoardSigner.address
        );
    });

    it("only signer should sign", async function() {
        testHelpers.expectThrow(
            stabilityBoardSigner.sign("0xaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", { from: accounts[1] })
        );
    });

    it("signer should be able to sign", async function() {
        const scriptAddress = "0x0000000000000000000000000000000000000001";
        const tx = await stabilityBoardSigner.sign(scriptAddress);
        testHelpers.logGasUse(this, tx, "multiSig.sign");

        const [script] = await Promise.all([
            stabilityBoardSignerWeb3Contract.methods.scripts(scriptAddress).call(),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptSigned", { signer: accounts[0], scriptAddress }),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptApproved", { scriptAddress })
        ]);
        assert.equal(script.signCount, 1);
        assert.equal(script.state, scriptState.Approved);
    });

    it("should not sign twice", async function() {
        const scriptAddress = "0x0000000000000000000000000000000000000002";
        const tx = await stabilityBoardSigner.sign(scriptAddress);
        testHelpers.logGasUse(this, tx, "multiSig.sign");

        await testHelpers.assertEvent(stabilityBoardSigner, "ScriptSigned", { signer: accounts[0], scriptAddress });

        await testHelpers.expectThrow(stabilityBoardSigner.sign(scriptAddress, { from: accounts[0] }));
    });

    it("should add then disable signers", async function() {
        const newSigners = [accounts[1], accounts[2]];

        const signersCountBefore = (await stabilityBoardSigner.activeSignersCount()).toNumber();

        const addSignerScript = await SB_addSigners.new(newSigners);

        const signTx = await stabilityBoardSigner.sign(addSignerScript.address);
        testHelpers.logGasUse(this, signTx, "multiSig.sign");

        const executeAddTx = await stabilityBoardSigner.execute(addSignerScript.address);
        testHelpers.logGasUse(this, executeAddTx, "multiSig.execute - add 2 signers");

        let [signersCountAfter, isSignerAfter0, isSignerAfter1, script] = await Promise.all([
            stabilityBoardSigner.activeSignersCount(),
            stabilityBoardSigner.isSigner(newSigners[0]),
            stabilityBoardSigner.isSigner(newSigners[1]),
            stabilityBoardSignerWeb3Contract.methods.scripts(addSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardSigner, "SignerAdded", [
                { signer: newSigners[0] },
                { signer: newSigners[1] }
            ]),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptExecuted", {
                scriptAddress: addSignerScript.address,
                result: true
            })
        ]);

        assert.equal(script.state, scriptState.Done);
        assert(isSignerAfter0);
        assert(isSignerAfter1);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore + newSigners.length);

        // REMOVE
        const removeSignerScript = await SB_removeSigners.new(newSigners);

        const [signTx1, signTx2] = await Promise.all([
            await stabilityBoardSigner.sign(removeSignerScript.address, { from: newSigners[0] }),
            await stabilityBoardSigner.sign(removeSignerScript.address, { from: newSigners[1] })
        ]);
        testHelpers.logGasUse(this, signTx1, "multiSig.sign");
        testHelpers.logGasUse(this, signTx2, "multiSig.sign");

        const executeRemoveTx = await stabilityBoardSigner.execute(removeSignerScript.address);
        testHelpers.logGasUse(this, executeRemoveTx, "multiSig.execute - remove 2 signers");

        [signersCountAfter, isSignerAfter0, isSignerAfter1, script] = await Promise.all([
            stabilityBoardSigner.activeSignersCount(),
            stabilityBoardSigner.isSigner(newSigners[0]),
            stabilityBoardSigner.isSigner(newSigners[1]),
            stabilityBoardSignerWeb3Contract.methods.scripts(addSignerScript.address).call(),
            testHelpers.assertEvent(stabilityBoardSigner, "SignerRemoved", [
                { signer: newSigners[0] },
                { signer: newSigners[1] }
            ]),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptExecuted", {
                scriptAddress: removeSignerScript.address,
                result: true
            })
        ]);

        assert.equal(script.state, scriptState.Done);
        assert(!isSignerAfter0);
        assert(!isSignerAfter1);
        assert.equal(signersCountAfter.toNumber(), signersCountBefore);
    });

    it("should not execute when script is New state (no quorum)");

    it("should accept signatures after quorum reached");

    it("should cancel a script in New state");

    it("should cancel a script in Approved state");

    it("should not cancel a script in Done / Cancelled / Failed state");

    it("should set script state to Failed if script fails", async function() {
        const revertingScript = await SB_revertingScript.new();
        await stabilityBoardSigner.sign(revertingScript.address);

        const tx = await stabilityBoardSigner.execute(revertingScript.address);
        testHelpers.logGasUse(this, tx, "multiSig.execute - revertingScript");

        const [signersCountAfter, script] = await Promise.all([
            stabilityBoardSigner.activeSignersCount(),
            stabilityBoardSignerWeb3Contract.methods.scripts(revertingScript.address).call(),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptExecuted", {
                scriptAddress: revertingScript.address,
                result: false
            })
        ]);

        assert.equal(signersCountAfter.toNumber(), 1);
        assert.equal(script.state, scriptState.Failed);
    });

    it("should set script state to Failed if script runs out of gas", async function() {
        const outOfGasScript = await SB_outOfGasScript.new();
        await stabilityBoardSigner.sign(outOfGasScript.address);
        const tx = await stabilityBoardSigner.execute(outOfGasScript.address, { gas: 200000 });
        testHelpers.logGasUse(this, tx, "multiSig.execute - outOfGasScript");

        const [script] = await Promise.all([
            stabilityBoardSignerWeb3Contract.methods.scripts(outOfGasScript.address).call(),
            testHelpers.assertEvent(stabilityBoardSigner, "ScriptExecuted", {
                scriptAddress: outOfGasScript.address,
                result: false
            })
        ]);

        assert.equal(script.state, scriptState.Failed);
    });

    it("should not execute a script in Done / Failed / Cancelled state");

    it("only a signer should execute an Approved script", async function() {
        const addSignerScript = await SB_addSigners.new([accounts[1]]);
        await stabilityBoardSigner.sign(addSignerScript.address);

        await testHelpers.expectThrow(stabilityBoardSigner.execute(addSignerScript.address, { from: accounts[1] }));
    });

    it("should not call cancelScript directly", async function() {
        const addSignerScript = await SB_addSigners.new([accounts[1]]);
        await stabilityBoardSigner.sign(addSignerScript.address);

        await testHelpers.expectThrow(stabilityBoardSigner.cancelScript(addSignerScript.address));
    });

    it("should not call addSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardSigner.addSigners([accounts[0]]));
    });

    it("should not call removeSigners directly", async function() {
        testHelpers.expectThrow(stabilityBoardSigner.removeSigners([accounts[0]]));
    });
});
