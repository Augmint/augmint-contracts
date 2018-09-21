/* Issue first pretokens */

pragma solidity 0.4.24;

import "../../PreToken.sol";


contract Main0012_issuePretokens001 {

    PreToken constant
            preToken = PreToken(0xeCb782B19Be6E657ae2D88831dD98145A00D32D5);
    bytes32 constant AGREEMENT_OS = 0x72e72ffde2b50bdb6e1f9ee74415c717879cbc255f7517606dbaef949ec421f0;
    address constant ADDRESS_OS = 0x4b4b210bFddb176Be6ab4005E77dB89d8c7bA0c4;

    function execute(Main0012_issuePretokens001 /* self (not used) */) external  {
        /* BD */
         preToken.addAgreement(ADDRESS_OS, AGREEMENT_OS, 800000, 15000000);
         preToken.issueTo(AGREEMENT_OS, 103092);

    }

}
