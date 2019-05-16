/* Recreate loan products on mainnet (fix for discountRate rounding error) */

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