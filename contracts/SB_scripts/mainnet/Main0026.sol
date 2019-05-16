/* Issue legacy tokens in order to repay two loans (id 23 & 24) in legacy loanManager contract at 0xCBeFaF199b800DEeB9EAd61f358EE46E06c54070.
The ETH value for the issued A-EUR is going to be sent into Reserve contract at 0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477 */
pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../TokenAEur.sol";

contract Main0026 {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);
    TokenAEur public constant OLD_TOKEN_AEUR = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);
    address public constant ADDRESS = 0xd97500098672F2636902E41D3928706C27470DF7;

    function execute(Main0026 /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        OLD_TOKEN_AEUR.grantPermission(ADDRESS, "MonetarySupervisor");
        OLD_TOKEN_AEUR.issueTo(ADDRESS, 35269);
        OLD_TOKEN_AEUR.revokePermission(ADDRESS, "MonetarySupervisor");
    }
}