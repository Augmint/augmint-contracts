pragma solidity 0.4.19;


contract Migrations {
    address public owner;
    uint public last_completed_migration; // solhint-disable-line var-name-mixedcase

    modifier restricted() {
        if (msg.sender == owner) _;
    }

    function Migrations() public {
        owner = msg.sender;
    }

    function setCompleted(uint completed) external restricted {
        last_completed_migration = completed;
    }

    function upgrade(address newAddress) external restricted {
        Migrations upgraded = Migrations(newAddress);
        upgraded.setCompleted(last_completed_migration);
    }
}
