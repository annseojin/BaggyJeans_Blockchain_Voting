// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

// MultiElectionVote용 인터페이스
interface IMultiElectionVote {
    function hasVoted(uint256 electionId, address user) external view returns (bool);
}

contract VotingReceiptNFT is ERC721URIStorage, Ownable {
    uint256 public nextTokenId;
    IMultiElectionVote public voteContract;

    struct ReceiptInfo {
        uint256 electionId;
        uint256 timestamp;
    }

    // 토큰ID → 영수증 정보
    mapping(uint256 => ReceiptInfo) public receipts;

    // (주소 → electionId) 기준으로 이미 영수증을 받았는지
    mapping(address => mapping(uint256 => bool)) public hasReceipt;

    constructor(address _voteContract) ERC721("Voting Receipt", "VREC") {
        voteContract = IMultiElectionVote(_voteContract);
    }

    function setVoteContract(address _voteContract) external onlyOwner {
        voteContract = IMultiElectionVote(_voteContract);
    }

    /**
     * msg.sender 기준으로:
     * 1) MultiElectionVote에서 해당 electionId에 실제로 투표했는지 확인
     * 2) 해당 electionId에 대해 이미 영수증을 받지 않았는지 확인
     * 3) metadataURI 붙여서 NFT 발행
     */
    function mintReceipt(
        uint256 electionId,
        string memory metadataURI
    ) external returns (uint256) {
        require(address(voteContract) != address(0), "Vote contract not set");
        require(
            voteContract.hasVoted(electionId, msg.sender),
            "You have not voted in this election"
        );
        require(
            !hasReceipt[msg.sender][electionId],
            "Receipt already minted for this election"
        );

        uint256 tokenId = ++nextTokenId;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, metadataURI);

        receipts[tokenId] = ReceiptInfo({
            electionId: electionId,
            timestamp: block.timestamp
        });

        hasReceipt[msg.sender][electionId] = true;

        return tokenId;
    }

    function _baseURI() internal pure override returns (string memory) {
        return "";
    }
}
