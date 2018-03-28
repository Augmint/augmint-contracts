/* MultiSig for 50% stakeholder transactions */
pragma solidity 0.4.19;
import "./generic/MultiSig.sol";


contract StakeHolder50Signer is MultiSig {
    function StakeHolder50Signer(address[] _signers)
    public MultiSig(500000, _signers)
    {} // solhint-disable-line no-empty-blocks

}
