// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title CypherRollVRFConsumer
 * @notice Decentralized On-Chain Verifiable Randomness Consumer for CypherRoll Casino
 * @dev Integrates Chainlink VRF v2.5 on Base & Arbitrum with non-custodial fulfillment
 */

interface IVRFCoordinatorV2Plus {
    function requestRandomWords(
        bytes32 keyHash,
        uint256 subId,
        uint16 minimumRequestConfirmations,
        uint32 callbackGasLimit,
        uint32 numWords
    ) external returns (uint256 requestId);
}

contract CypherRollVRFConsumer {
    address public immutable owner;
    address public operator;
    IVRFCoordinatorV2Plus public vrfCoordinator;

    bytes32 public keyHash;
    uint256 public subscriptionId;
    uint16 public constant REQUEST_CONFIRMATIONS = 3;
    uint32 public constant CALLBACK_GAS_LIMIT = 200000;
    uint32 public constant NUM_WORDS = 1;

    struct VRFRequestStatus {
        uint256 roundId;
        uint256 randomWord;
        bool fulfilled;
        uint256 timestamp;
    }

    mapping(uint256 => VRFRequestStatus) public requests; // requestId => status
    mapping(uint256 => uint256) public roundToRequest;    // roundId => requestId

    event RandomnessRequested(uint256 indexed requestId, uint256 indexed roundId);
    event RandomnessFulfilled(uint256 indexed requestId, uint256 indexed roundId, uint256 randomWord);

    modifier onlyOwner() {
        require(msg.sender == owner, "Only owner");
        _;
    }

    modifier onlyOperator() {
        require(msg.sender == operator || msg.sender == owner, "Only operator");
        _;
    }

    modifier onlyVRFCoordinator() {
        require(msg.sender == address(vrfCoordinator), "Only VRF Coordinator");
        _;
    }

    constructor(
        address _vrfCoordinator,
        bytes32 _keyHash,
        uint256 _subId,
        address _operator
    ) {
        owner = msg.sender;
        operator = _operator;
        vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subId;
    }

    function setOperator(address _newOperator) external onlyOwner {
        operator = _newOperator;
    }

    function setVRFConfig(address _vrfCoordinator, bytes32 _keyHash, uint256 _subId) external onlyOwner {
        vrfCoordinator = IVRFCoordinatorV2Plus(_vrfCoordinator);
        keyHash = _keyHash;
        subscriptionId = _subId;
    }

    /**
     * @notice Requests verifiable on-chain randomness for a specific high-stakes game round
     */
    function requestEntropy(uint256 roundId) external onlyOperator returns (uint256 requestId) {
        require(roundToRequest[roundId] == 0, "Round already requested");

        requestId = vrfCoordinator.requestRandomWords(
            keyHash,
            subscriptionId,
            REQUEST_CONFIRMATIONS,
            CALLBACK_GAS_LIMIT,
            NUM_WORDS
        );

        requests[requestId] = VRFRequestStatus({
            roundId: roundId,
            randomWord: 0,
            fulfilled: false,
            timestamp: block.timestamp
        });

        roundToRequest[roundId] = requestId;
        emit RandomnessRequested(requestId, roundId);
        return requestId;
    }

    /**
     * @notice Callback invoked by Chainlink VRF Coordinator
     */
    function rawFulfillRandomWords(uint256 requestId, uint256[] memory randomWords) external onlyVRFCoordinator {
        require(!requests[requestId].fulfilled, "Already fulfilled");
        require(requests[requestId].timestamp > 0, "Request not found");

        uint256 randomWord = randomWords[0];
        requests[requestId].fulfilled = true;
        requests[requestId].randomWord = randomWord;

        emit RandomnessFulfilled(requestId, requests[requestId].roundId, randomWord);
    }

    /**
     * @notice View helper to check if round randomness has landed on-chain
     */
    function getRoundRandomness(uint256 roundId) external view returns (bool fulfilled, uint256 randomWord) {
        uint256 reqId = roundToRequest[roundId];
        if (reqId == 0) return (false, 0);
        VRFRequestStatus memory s = requests[reqId];
        return (s.fulfilled, s.randomWord);
    }
}
