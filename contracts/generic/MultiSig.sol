/*
 WIP

 TODO:
  - add/remove signer
  - how to ensure  lost private key(s) of signers not causing complete block of any execution?
  - shall we restrict  execute to be called by a signer?
  - do we need to add network id to signed data?
  - test signing with trezor signature:
    https://github.com/0xProject/0x-monorepo/blob/095388ffe05ca51e92db87ba81d6e4f29b1ab087/packages/contracts/src/contracts/current/protocol/Exchange/MixinSignatureValidator.sol
  - EIP712 & ERC191 signature schemes?
  - use a modifer and this.call instead of destination?
  - UX flow? what helper functions required?
  - check quorum: <= or < ? (50% + 1 vote with lot of voters)
  - use only singatures[] param in execute and deconstruct w/ assembly:
        https://github.com/OpenZeppelin/zeppelin-solidity/blob/master/contracts/ECRecovery.sol
*/
pragma solidity 0.4.19;

import "./SafeMath.sol";


contract MultiSig {
    using SafeMath for uint256;
    uint public nonce;
    uint32 public thresholdPt; // in parts per million , ie. 10,000 = 1%
    uint32 constant public PERCENT100 = 1000000;
    mapping(address => bool) public isSigner;
    address[] public signers;

    function MultiSig(uint32 _thresholdPt, address[] _signers) public {
        require(_signers.length > 0);
        require(_thresholdPt > 0);
        require(_thresholdPt <= PERCENT100);

        for (uint i = 0; i < _signers.length; i++) {
            isSigner[_signers[i]] = true;
        }
        signers = _signers;
        thresholdPt = _thresholdPt;
    }

    // Note that address recovered from signatures must be strictly increasing
    //  (protect against someone submitting multiple signatures from the same address)
    function execute(uint8[] sigV, bytes32[] sigR, bytes32[] sigS, address destination, uint value, bytes data)
    external {
        require(checkQuorum(sigR.length));
        require(sigR.length == sigS.length);
        require(sigR.length == sigV.length);

        bytes32 txHash = keccak256(this, destination, value, data, nonce);
        txHash = keccak256("\x19Ethereum Signed Message:\n32", txHash);
        address lastAdd = 0x0; // cannot have address(0) as an owner
        for (uint i = 0; i < sigR.length; i++) {
            address recovered = ecrecover(txHash, sigV[i], sigR[i], sigS[i]);
            require(recovered > lastAdd);
            require(isSigner[recovered]);
            lastAdd = recovered;
        }

        // If we make it here all signatures are accounted for
        nonce = nonce + 1;
        require(destination.call.value(value)(data)); // solhint-disable-line avoid-call-value
    }

    function checkQuorum(uint signersCount) internal view returns(bool isQuorum) {
        isQuorum = signersCount.mul(PERCENT100).div(signers.length) >= thresholdPt;
    }

    /*
    TODO: would be great to pass only sigs to execute then use this recover but can't pass bytes[]...

    function recover(bytes32 hash, bytes sig) internal pure returns (address) {
        bytes32 r;
        bytes32 s;
        uint8 v;

        //Check the signature length
        if (sig.length != 65) {
            return (address(0));
        }

        // Divide the signature in r, s and v variables
        assembly { // solhint-disable-line no-inline-assembly
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }

        // Version of signature should be 27 or 28, but 0 and 1 are also possible versions
        if (v < 27) {
            v += 27;
        }

        // If the version is correct return the signer address
        if (v != 27 && v != 28) {
            return (address(0));
        } else {
            return ecrecover(hash, v, r, s);
        }
    } */

}
