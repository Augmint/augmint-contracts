/* Augmint pretoken contract to record agreements and tokens allocated based on the agreement.
Important: this is NOT an ERC20 token!
These tokens are not fungible because agreements can have different conditions (valuationCap and discount)
    and pretokens are not tradable.
Only the total pretoken amount and the aggrement can be transfered to a different account to be able to change wallets
Despite it some ERC20 functions are implemented so agreement owners can see their
    balances and transfers in standard wallets.
Restrictions:
  - only total account balance can be transfered - effectively ERC20 transfer used to transfer agreement ownership
  - only allowed to agreement holders can transfer
    (i.e. can't transfer 0 amount if have no agreement to avoid polluting logs with Transfer events)
  - transfer is only allowed to accounts without an agreement yet
  - no approval and transferFrom ERC20 functions
 */

pragma solidity 0.4.24;
import "./generic/SafeMath.sol";
import "./generic/Restricted.sol";


contract PreToken is Restricted {
    using SafeMath for uint256;

    uint public constant CHUNK_SIZE = 100;

    string constant public name = "Augmint pretokens"; // solhint-disable-line const-name-snakecase
    string constant public symbol = "APRE"; // solhint-disable-line const-name-snakecase
    uint8 constant public decimals = 0; // solhint-disable-line const-name-snakecase

    uint public totalSupply;

    struct Agreement {
        address owner;
        uint balance;
        uint32 discount; //  discountRate in parts per million , ie. 10,000 = 1%
        uint32 valuationCap; // in USD (no decimals)
    }

    /* Agreement hash is the SHA-2 (SHA-256) hash of signed agreement document.
         To generate:
            OSX: shasum -a 256 agreement.pdf
            Windows: certUtil -hashfile agreement.pdf SHA256 */
    mapping(address => bytes32) public agreementOwners; // to lookup agrement by owner
    mapping(bytes32 => Agreement) public agreements;

    bytes32[] public allAgreements; // all agreements to able to iterate over

    event Transfer(address indexed from, address indexed to, uint amount);

    event NewAgreement(address owner, bytes32 agreementHash, uint32 discount, uint32 valuationCap);

    function addAgreement(address owner, bytes32 agreementHash, uint32 discount, uint32 valuationCap)
    external restrict("PreTokenSigner") {
        require(owner != address(0), "owner must not be 0x0");
        require(agreementOwners[owner] == 0x0, "owner must not have an aggrement yet");
        require(agreementHash != 0x0, "agreementHash must not be 0x0");
        require(discount > 0, "discount must be > 0");
        require(agreements[agreementHash].discount == 0, "agreement must not exist yet");

        agreements[agreementHash] = Agreement(owner, 0, discount, valuationCap);
        agreementOwners[owner] = agreementHash;
        allAgreements.push(agreementHash);

        emit NewAgreement(owner, agreementHash, discount, valuationCap);
    }

    function issueTo(bytes32 agreementHash, uint amount) external restrict("PreTokenSigner") {
        Agreement storage agreement = agreements[agreementHash];
        require(agreement.discount > 0, "agreement must exist");

        agreement.balance = agreement.balance.add(amount);
        totalSupply = totalSupply.add(amount);

        emit Transfer(0x0, agreement.owner, amount);
    }

    /* Restricted function to allow pretoken signers to fix incorrect issuance */
    function burnFrom(bytes32 agreementHash, uint amount)
    public restrict("PreTokenSigner") returns (bool) {
        Agreement storage agreement = agreements[agreementHash];
        require(agreement.discount > 0, "agreement must exist"); // this is redundant b/c of next requires but be explicit
        require(amount > 0, "burn amount must be > 0");
        require(agreement.balance >= amount, "must not burn more than balance"); // .sub would revert anyways but emit reason

        agreement.balance = agreement.balance.sub(amount);
        totalSupply = totalSupply.sub(amount);

        emit Transfer(agreement.owner, 0x0, amount);
        return true;
    }

    function balanceOf(address owner) public view returns (uint) {
        return agreements[agreementOwners[owner]].balance;
    }

    /* function to transfer agreement ownership to other wallet by owner
        it's in ERC20 form so owners can use standard ERC20 wallet just need to pass full balance as value */
    function transfer(address to, uint amount) public returns (bool) { // solhint-disable-line no-simple-event-func-name
        _transfer(msg.sender, to, amount);
        return true;
    }

    /* Restricted function to allow pretoken signers to fix if pretoken owner lost keys */
    function transferAgreement(bytes32 agreementHash, address to)
    public restrict("PreTokenSigner") returns (bool) {
        _transfer(agreements[agreementHash].owner, to, agreements[agreementHash].balance);
        return true;
    }

    /* private function used by transferAgreement & transfer */
    function _transfer(address from, address to, uint amount) private {
        Agreement storage agreement = agreements[agreementOwners[from]];
        require(agreementOwners[from] != 0x0, "from agreement must exists");
        require(agreementOwners[to] == 0, "to must not have an agreement");
        require(to != 0x0, "must not transfer to 0x0");
        require(amount == agreement.balance, "must transfer full balance");

        agreement.owner = to;

        agreementOwners[to] = agreementOwners[from];
        agreementOwners[from] = 0x0;

        emit Transfer(from, to, amount);
    }

    function getAgreementsCount() external view returns (uint agreementsCount) {
        return allAgreements.length;
    }

    // UI helper fx - Returns all agreements from offset as
    // [index in allAgreements, account address as uint, balance, agreementHash as uint,
    //          discount as uint, valuationCap as uint ]
    function getAllAgreements(uint offset) external view returns(uint[6][CHUNK_SIZE] agreementsResult) {

        for (uint8 i = 0; i < CHUNK_SIZE && i + offset < allAgreements.length; i++) {
            bytes32 agreementHash = allAgreements[i + offset];
            Agreement storage agreement = agreements[agreementHash];

            agreementsResult[i] = [ i + offset, uint(agreement.owner), agreement.balance,
                uint(agreementHash), uint(agreement.discount), uint(agreement.valuationCap)];
        }
    }
}
