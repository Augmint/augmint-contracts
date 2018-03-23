/* test Restriced via AugmintToken
 Note that grant, grantMultiple and revoke are tested around in other tests
*/
const testHelpers = require("./helpers/testHelpers.js");
const tokenTestHelpers = require("./helpers/tokenTestHelpers.js");

let augmintTokenInstance;

contract("Restricted.sol tests", accounts => {
    before(async () => {
        augmintTokenInstance = tokenTestHelpers.augmintToken;
    });

    it("only permitted should be able to grant permissions ", async function() {
        await testHelpers.expectThrow(
            augmintTokenInstance.grantPermission(accounts[0], "TESTPERMISSION", { from: accounts[1] })
        );
    });

    it("only permitted should be able to grant multiple permissions ", async function() {
        await testHelpers.expectThrow(
            augmintTokenInstance.grantMultiplePermissions(accounts[0], ["TESTPERMISSION1", "TESTPERMISSION2"], {
                from: accounts[1]
            })
        );
    });

    it("only permitted to revoke  permission ", async function() {
        await testHelpers.expectThrow(
            augmintTokenInstance.revokePermission(accounts[0], "TESTPERMISSION1", {
                from: accounts[1]
            })
        );
    });

    it("should grant & revoke multiple permissions ", async function() {
        await augmintTokenInstance.grantMultiplePermissions(accounts[0], ["perm1", "perm2"], {
            from: accounts[0]
        });
        let perm1;
        let perm2;
        [perm1, perm2] = await Promise.all([
            augmintTokenInstance.permissions(accounts[0], "perm1"),
            augmintTokenInstance.permissions(accounts[0], "perm2")
        ]);
        assert.equal(perm1, true);
        assert.equal(perm2, true);

        await augmintTokenInstance.revokeMultiplePermissions(accounts[0], ["perm1", "perm2"], {
            from: accounts[0]
        });
        [perm1, perm2] = await Promise.all([
            augmintTokenInstance.permissions(accounts[0], "perm1"),
            augmintTokenInstance.permissions(accounts[0], "perm2")
        ]);
        assert.equal(perm1, false);
        assert.equal(perm2, false);
    });

    it("only permitted to revoke multiple permissions ", async function() {
        await testHelpers.expectThrow(
            augmintTokenInstance.revokeMultiplePermissions(accounts[0], ["TESTPERMISSION1", "TESTPERMISSION2"], {
                from: accounts[1]
            })
        );
    });
});
