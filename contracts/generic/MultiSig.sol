/* Abstract multisig contract to allow multi approval execution of atomic contracts scripts
        e.g. migrations or settings.
    Scripts are allowed to run only once.
    Each derived contract should implement checkQuorum
    TODO:
    - consider allowing only one pending script by:
        a) store prevScript and don't allow new script until that is New or Approved
            OR
        b) store script approve date and don't allow running it after x days
    - allSigners batch getter in chunks, from offset
    - scripts batch getter in chunks, from offset
    - script.allSigners batch getter in chunks, from offset
    - do we need signature revoke?
*/
pragma solidity 0.4.24;

import "./SafeMath.sol";


contract MultiSig {
    using SafeMath for uint256;

    mapping(address => bool) public isSigner;
    address[] public allSigners; // all signers, even the disabled ones
    uint public activeSignersCount;

    enum ScriptState {New, Approved, Done, Cancelled, Failed}

    struct Script {
        ScriptState state;  // do we want to calculate quorum at the time time of sign or execute call ?
        uint signCount;
        mapping(address => bool) signedBy;
        address[] allSigners;  // all signers even whom revoked their signature
    }

    mapping(address => Script) public scripts;
    address[] public scriptAddresses;

    event SignerAdded(address signer);
    event SignerRemoved(address signer);

    event ScriptSigned(address scriptAddress, address signer);
    /* event ScriptSignatureRevoked(address scriptAddress, address signer); */
    event ScriptApproved(address scriptAddress);
    event ScriptCancelled(address scriptAddress);

    event ScriptExecuted(address scriptAddress, bool result);

    constructor() public {
        // deployer address is the first signer. Deployer should add signers after deployed and configured contracts
        // The first script which sets the new contracts live should revoke deployer's signature
        isSigner[msg.sender] = true;
        allSigners.push(msg.sender);
        activeSignersCount = 1;
    }

    function sign(address scriptAddress) public {
        require(isSigner[msg.sender], "sender must be signer");
        Script storage script = scripts[scriptAddress];
        require(script.state == ScriptState.Approved || script.state == ScriptState.New,
                "script state must be New or Approved");
        require(!script.signedBy[msg.sender], "script must not be signed by signer yet");

        if(script.allSigners.length == 0) {
            // first sign of a new script
            scriptAddresses.push(scriptAddress);
        }

        script.allSigners.push(msg.sender);
        script.signedBy[msg.sender] =  true;
        script.signCount = script.signCount.add(1);

        emit ScriptSigned(scriptAddress, msg.sender);

        if(checkQuorum(script.signCount)){
            script.state = ScriptState.Approved;
            emit ScriptApproved(scriptAddress);
        }
    }

    /* Do we need this?
     function revokeApproval(address scriptAddress) public {
        require(isSigner[msg.sender], "sender must be signer");
        require(script.state = ScriptState.New, "script state must be New");
        require(script.signedBy[msg.sender], "script must be signed by signer");
        // ....
    } */

    function execute(address scriptAddress) public returns (bool result) {
        // only allow execute to signers to avoid someone set an approved script failed by calling it with low gaslimit
        require(isSigner[msg.sender], "sender must be signer");
        Script storage script = scripts[scriptAddress];
        require(script.state == ScriptState.Approved, "script state must be Approved");

        /* init to failed because if delegatecall rans out of gas we won't have enough left to set it.
           NB: delegatecall leaves 63/64 part of gasLimit for the caller.
                Therefore the execute might revert with out of gas, leaving script in Approved state
                when execute() is called with small gas limits.
        */
        script.state = ScriptState.Failed;

        // passing scriptAddress to allow called script access its own storage if needed
        if(scriptAddress.delegatecall(bytes4(keccak256("execute(address)")), scriptAddress)) {
            script.state = ScriptState.Done;
            result = true;
        } else {
            result = false;
        }
        emit ScriptExecuted(scriptAddress, result);
    }

    function cancelScript(address scriptAddress) public {
        require(msg.sender == address(this), "only callable via MultiSig");
        Script storage script = scripts[scriptAddress];
        require(script.state == ScriptState.Approved || script.state == ScriptState.New,
                "script state must be New or Approved");

        script.state= ScriptState.Cancelled;

        emit ScriptCancelled(scriptAddress);
    }

    /* requires quorum so it's callable only via a script executed by this contract */
    function addSigners(address[] signers) public {
        require(msg.sender == address(this), "only callable via MultiSig");
        for (uint i= 0; i < signers.length; i++) {
            if (!isSigner[signers[i]]) {
                activeSignersCount++;
                allSigners.push(signers[i]);
                isSigner[signers[i]] = true;
                emit SignerAdded(signers[i]);
            }
        }
    }

    /* requires quorum so it's callable only via a script executed by this contract */
    function removeSigners(address[] signers) public {
        require(msg.sender == address(this), "only callable via MultiSig");
        for (uint i= 0; i < signers.length; i++) {
            if (isSigner[signers[i]]) {
                activeSignersCount--;
                isSigner[signers[i]] = false;
                emit SignerRemoved(signers[i]);
            }
        }
    }

    /* implement it in derived contract */
    function checkQuorum(uint signersCount) internal view returns(bool isQuorum);

}
