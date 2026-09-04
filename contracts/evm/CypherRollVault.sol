// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title CypherRollVault
 * @dev Production-ready Escrow Vault for CypherRoll Web3 Casino.
 * Handles deposits of Native ETH and ERC20 stablecoins (e.g. USDC).
 * Withdrawals are non-custodial and authorized via EIP-712 cryptographic signatures from the casino operator.
 */

interface IERC20 {
    function transfer(address recipient, uint256 amount) external returns (bool);
    function transferFrom(address sender, address recipient, uint256 amount) external returns (bool);
    function balanceOf(address account) external view returns (uint256);
}

contract CypherRollVault {
    address public immutable owner;
    address public operatorSigner;
    bool public paused;

    // EIP-712 Domain Separator components
    bytes32 public immutable DOMAIN_SEPARATOR;
    bytes32 public constant WITHDRAWAL_TYPEHASH = keccak256(
        "Withdrawal(address player,address token,uint256 amount,uint256 nonce,uint256 deadline)"
    );

    // player => nonces used
    mapping(address => uint256) public userNonces;

    // Track platform total locked balances per token
    mapping(address => uint256) public tokenVaultReserves;

    event Deposited(address indexed player, address indexed token, uint256 amount, uint256 timestamp);
    event Withdrawn(address indexed player, address indexed token, uint256 amount, uint256 nonce, uint256 timestamp);
    event OperatorSignerUpdated(address indexed oldSigner, address indexed newSigner);
    event EmergencyPaused(bool isPaused);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier whenNotPaused() {
        require(!paused, "Vault is paused");
        _;
    }

    constructor(address _operatorSigner) {
        require(_operatorSigner != address(0), "Invalid signer");
        owner = msg.sender;
        operatorSigner = _operatorSigner;

        DOMAIN_SEPARATOR = keccak256(
            abi.encode(
                keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)"),
                keccak256(bytes("CypherRollVault")),
                keccak256(bytes("1")),
                block.chainid,
                address(this)
            )
        );
    }

    /**
     * @notice Deposit native ETH into the casino vault.
     */
    function depositETH() external payable whenNotPaused {
        require(msg.value > 0, "Zero deposit");
        tokenVaultReserves[address(0)] += msg.value;
        emit Deposited(msg.sender, address(0), msg.value, block.timestamp);
    }

    /**
     * @notice Deposit standard ERC20 tokens (e.g. USDC, USDT) into vault.
     */
    function depositERC20(address token, uint256 amount) external whenNotPaused {
        require(token != address(0), "Invalid token");
        require(amount > 0, "Zero amount");

        bool success = IERC20(token).transferFrom(msg.sender, address(this), amount);
        require(success, "Transfer failed");

        tokenVaultReserves[token] += amount;
        emit Deposited(msg.sender, token, amount, block.timestamp);
    }

    /**
     * @notice Player triggers withdrawal verified by an operator cryptographic signature.
     */
    function withdraw(
        address token,
        uint256 amount,
        uint256 nonce,
        uint256 deadline,
        bytes calldata signature
    ) external whenNotPaused {
        require(block.timestamp <= deadline, "Signature expired");
        require(nonce == userNonces[msg.sender] + 1, "Invalid nonce sequence");
        require(tokenVaultReserves[token] >= amount, "Insufficient vault reserves");

        // Verify EIP-712 signature from operatorSigner
        bytes32 structHash = keccak256(
            abi.encode(WITHDRAWAL_TYPEHASH, msg.sender, token, amount, nonce, deadline)
        );
        bytes32 digest = keccak256(
            abi.encodePacked("\x19\x01", DOMAIN_SEPARATOR, structHash)
        );

        address recovered = recoverSigner(digest, signature);
        require(recovered == operatorSigner, "Invalid operator signature");

        // Update state before external transfer (Reentrancy guard)
        userNonces[msg.sender] = nonce;
        tokenVaultReserves[token] -= amount;

        if (token == address(0)) {
            (bool sent, ) = msg.sender.call{value: amount}("");
            require(sent, "ETH transfer failed");
        } else {
            bool sent = IERC20(token).transfer(msg.sender, amount);
            require(sent, "ERC20 transfer failed");
        }

        emit Withdrawn(msg.sender, token, amount, nonce, block.timestamp);
    }

    function recoverSigner(bytes32 digest, bytes memory sig) internal pure returns (address) {
        require(sig.length == 65, "Invalid sig length");
        bytes32 r;
        bytes32 s;
        uint8 v;
        assembly {
            r := mload(add(sig, 32))
            s := mload(add(sig, 64))
            v := byte(0, mload(add(sig, 96)))
        }
        return ecrecover(digest, v, r, s);
    }

    function setOperatorSigner(address _newSigner) external onlyOwner {
        require(_newSigner != address(0), "Invalid address");
        emit OperatorSignerUpdated(operatorSigner, _newSigner);
        operatorSigner = _newSigner;
    }

    function setPaused(bool _paused) external onlyOwner {
        paused = _paused;
        emit EmergencyPaused(_paused);
    }
}
