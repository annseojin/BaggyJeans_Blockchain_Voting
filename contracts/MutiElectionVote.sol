// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract MultiElectionVote is Ownable {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    struct Election {
        bool exists;
        bool votingOpen;
        uint256 createdAt;
    }

    // electionId => 후보 목록
    mapping(uint256 => Candidate[]) private _candidates;
    // electionId => 선거 정보
    mapping(uint256 => Election) private _elections;
    // electionId, voter => 투표 여부
    mapping(uint256 => mapping(address => bool)) private _hasVoted;

    event ElectionCreated(uint256 electionId, string[] candidateNames, uint256 timestamp);
    event Voted(uint256 electionId, uint256 candidateIndex, address voter, uint256 timestamp);
    event VotingClosed(uint256 electionId, uint256 timestamp);

    // 투표 기록 저장 (블록체인 탐색기용)
    struct VoteRecord {
        uint256 electionId;
        uint256 candidateIndex;
        address voter;
        uint256 timestamp;
    }

    VoteRecord[] public voteHistory;
    uint256[] public electionIds;

    function createElection(uint256 electionId, string[] calldata candidateNames)
        external
        onlyOwner
    {
        require(!_elections[electionId].exists, "Election already exists");
        require(candidateNames.length > 0, "No candidates");

        Election storage e = _elections[electionId];
        e.exists = true;
        e.votingOpen = true;
        e.createdAt = block.timestamp;

        for (uint256 i = 0; i < candidateNames.length; i++) {
            _candidates[electionId].push(Candidate(candidateNames[i], 0));
        }

        electionIds.push(electionId);
        emit ElectionCreated(electionId, candidateNames, block.timestamp);
    }

    function getCandidates(uint256 electionId)
        external
        view
        returns (Candidate[] memory)
    {
        return _candidates[electionId];
    }

    function hasVoted(uint256 electionId, address user)
        external
        view
        returns (bool)
    {
        return _hasVoted[electionId][user];
    }

    function vote(uint256 electionId, uint256 candidateIndex) external {
        require(_elections[electionId].exists, "Election not found");
        require(_elections[electionId].votingOpen, "Voting closed");
        require(!_hasVoted[electionId][msg.sender], "Already voted");

        Candidate[] storage cands = _candidates[electionId];
        require(candidateIndex < cands.length, "Invalid candidate");

        _hasVoted[electionId][msg.sender] = true;
        cands[candidateIndex].voteCount++;

        // 투표 기록 저장
        voteHistory.push(VoteRecord({
            electionId: electionId,
            candidateIndex: candidateIndex,
            voter: msg.sender,
            timestamp: block.timestamp
        }));

        emit Voted(electionId, candidateIndex, msg.sender, block.timestamp);
    }

    function closeVoting(uint256 electionId) external onlyOwner {
        require(_elections[electionId].exists, "Election not found");
        require(_elections[electionId].votingOpen, "Already closed");
        
        _elections[electionId].votingOpen = false;
        emit VotingClosed(electionId, block.timestamp);
    }

    function getWinner(uint256 electionId) 
        external 
        view 
        returns (string memory winnerName, uint256 winnerVoteCount, uint256 winnerIndex) 
    {
        require(_elections[electionId].exists, "Election not found");
        
        Candidate[] storage cands = _candidates[electionId];
        require(cands.length > 0, "No candidates");
        
        uint256 maxVotes = 0;
        uint256 maxIndex = 0;
        
        for (uint256 i = 0; i < cands.length; i++) {
            if (cands[i].voteCount > maxVotes) {
                maxVotes = cands[i].voteCount;
                maxIndex = i;
            }
        }
        
        return (cands[maxIndex].name, cands[maxIndex].voteCount, maxIndex);
    }

    function isVotingOpen(uint256 electionId) external view returns (bool) {
        return _elections[electionId].votingOpen;
    }

    // 블록체인 탐색기용 조회 함수들
    function getVoteHistoryCount() external view returns (uint256) {
        return voteHistory.length;
    }

    function getVoteHistory(uint256 index) external view returns (
        uint256 electionId,
        uint256 candidateIndex,
        address voter,
        uint256 timestamp
    ) {
        require(index < voteHistory.length, "Index out of bounds");
        VoteRecord memory record = voteHistory[index];
        return (record.electionId, record.candidateIndex, record.voter, record.timestamp);
    }

    function getAllElectionIds() external view returns (uint256[] memory) {
        return electionIds;
    }

    function getElectionInfo(uint256 electionId) external view returns (
        bool exists,
        bool votingOpen,
        uint256 createdAt,
        uint256 candidateCount,
        uint256 totalVotes
    ) {
        Election memory e = _elections[electionId];
        Candidate[] memory cands = _candidates[electionId];
        
        uint256 total = 0;
        for (uint256 i = 0; i < cands.length; i++) {
            total += cands[i].voteCount;
        }
        
        return (e.exists, e.votingOpen, e.createdAt, cands.length, total);
    }
}
