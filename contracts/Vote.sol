// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";

contract Vote is Ownable {
    struct Candidate {
        string name;
        uint256 voteCount;
    }

    Candidate[] public candidates;
    mapping(address => bool) public hasVoted;
    bool public votingOpen;

    event CandidateAdded(string name);
    event Voted(address indexed voter, uint256 indexed candidateId);
    event VotingOpened();
    event VotingClosed();

    constructor(string[] memory _candidateNames) {
        for (uint i = 0; i < _candidateNames.length; i++) {
            candidates.push(Candidate({name: _candidateNames[i], voteCount: 0}));
            emit CandidateAdded(_candidateNames[i]);
        }
        votingOpen = true;
        emit VotingOpened();
    }

    function getCandidates() external view returns (Candidate[] memory) {
        return candidates;
    }

    function vote(uint256 candidateId) external {
        require(votingOpen, "Voting is closed");
        require(!hasVoted[msg.sender], "Already voted");
        require(candidateId < candidates.length, "Invalid candidate");

        hasVoted[msg.sender] = true;
        candidates[candidateId].voteCount += 1;

        emit Voted(msg.sender, candidateId);
    }

    function openVoting() external onlyOwner {
        votingOpen = true;
        emit VotingOpened();
    }

    function closeVoting() external onlyOwner {
        votingOpen = false;
        emit VotingClosed();
    }
}