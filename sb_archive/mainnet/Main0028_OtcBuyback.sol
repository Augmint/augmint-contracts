/* OTC A-EUR buyback using Reserve ETH. Defaulted loans of 2002 A-EUR + monetary board issued of 352.69 A-EUR. */

pragma solidity 0.4.24;

import "../../StabilityBoardProxy.sol";
import "../../TokenAEur.sol";
import "../../AugmintReserves.sol";
import "../../Rates.sol";

contract Main0028_OtcBuyback {

    StabilityBoardProxy public constant STABILITY_BOARD_PROXY = StabilityBoardProxy(0xde36a8773531406dCBefFdfd3C7b89fCed7A9F84);

    TokenAEur public constant NEW_TOKEN_AEUR = TokenAEur(0xc994a2dEb02543Db1f48688438b9903c4b305ce3);
    AugmintReserves public constant NEW_AUGMINT_RESERVES = AugmintReserves(0x65F30f8DD20c707C1938CcAd7416c7381E6eB9C8);
    Rates public constant RATES = Rates(0x4272dB2EB82068E898588C3D6e4B5D55c3848793);

    address public constant T8_ADDRESS = 0x7C8bc54446C55E3A10F5F1467D30b0Fd8b9d3e9A;

    uint public constant tokenAmount = 235469;

    function execute(Main0028_OtcBuyback /* self, not used */) external {
        // called via StabilityBoardProxy
        require(address(this) == address(STABILITY_BOARD_PROXY), "only execute via StabilityBoardProxy");

        // function convertToWei(bytes32 bSymbol, uint value) external view returns(uint weiValue) {
        uint weiAmount = RATES.convertToWei(NEW_TOKEN_AEUR.peggedSymbol(), tokenAmount);

        // function migrate(address to, uint weiAmount)
        NEW_AUGMINT_RESERVES.migrate(T8_ADDRESS, weiAmount);
    }
}