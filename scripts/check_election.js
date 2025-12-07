const hre = require("hardhat");

async function main() {
  const contractAddress = process.env.VOTE_CONTRACT_ADDRESS;
  if (!contractAddress) {
    console.error("❌ VOTE_CONTRACT_ADDRESS env var is missing");
    process.exit(1);
  }

  const Vote = await hre.ethers.getContractFactory("MultiElectionVote");
  const contract = Vote.attach(contractAddress);

  console.log(`🔍 Checking contract at: ${contractAddress}`);

  // 1. Get all election IDs
  try {
    const electionIds = await contract.getAllElectionIds();
    console.log(`\n📋 Found ${electionIds.length} elections on-chain:`);

    for (const bnId of electionIds) {
      const id = bnId.toString();
      const info = await contract.getElectionInfo(id);
      const candidates = await contract.getCandidates(id);

      console.log(`\n------------------------------------------------`);
      console.log(`🗳️  Election ID: ${id}`);
      console.log(`   - Exists: ${info.exists}`);
      console.log(`   - Open: ${info.votingOpen}`);
      console.log(`   - Total Candidates: ${candidates.length}`);
      console.log(`   - Total Votes (Calculated): ${info.totalVotes}`);

      console.log(`   👥 Candidates:`);
      candidates.forEach((c, idx) => {
        console.log(`      [${idx}] ${c.name}: ${c.voteCount.toString()} votes`);
      });
    }
  } catch (err) {
    console.error("Error fetching data:", err);
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
