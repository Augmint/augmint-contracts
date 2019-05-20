/* Migrate stuff */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../TokenAEur.sol";
import "../../AugmintReserves.sol";
import "../../generic/SystemAccount.sol";

contract Main0027_migrate {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    TokenAEur public constant OLD_TOKEN_AEUR = TokenAEur(0x86A635EccEFFfA70Ff8A6DB29DA9C8DB288E40D0);
    TokenAEur public constant NEW_TOKEN_AEUR = TokenAEur(0xc994a2dEb02543Db1f48688438b9903c4b305ce3);

    SystemAccount public constant OLD_AUGMINT_RESERVES = SystemAccount(0x633cb544b2EF1bd9269B2111fD2B66fC05cd3477);
    AugmintReserves public constant NEW_AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);

    function execute(Main0027_migrate /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        // migrate ETH to new reserve
        // function withdraw(AugmintToken tokenAddress, address to, uint tokenAmount, uint weiAmount, string narrative)
        OLD_AUGMINT_RESERVES.withdraw(NEW_TOKEN_AEUR, address(NEW_AUGMINT_RESERVES), 0, address(OLD_AUGMINT_RESERVES).balance, "migration");
    }
}