// scripts/deploy.js
const { ethers } = require('hardhat');

async function main() {
  console.log('🚀 Deploying MultiElectionVote...');

  // 1) MultiElectionVote 배포
  const MultiElectionVote = await ethers.getContractFactory(
    'MultiElectionVote'
  );
  const multiElectionVote = await MultiElectionVote.deploy();

  await multiElectionVote.waitForDeployment();
  const voteAddress = await multiElectionVote.getAddress();

  console.log('✅ MultiElectionVote deployed to:', voteAddress);

  // 2) VotingReceiptNFT 배포 (voteAddress를 생성자에 전달)
  console.log('🚀 Deploying VotingReceiptNFT...');

  const VotingReceiptNFT = await ethers.getContractFactory('VotingReceiptNFT');
  const votingReceiptNFT = await VotingReceiptNFT.deploy(voteAddress);

  await votingReceiptNFT.waitForDeployment();
  const nftAddress = await votingReceiptNFT.getAddress();

  console.log('✅ VotingReceiptNFT deployed to:', nftAddress);

  console.log('\n📌 복사해서 프론트에 넣어줘야 할 값');
  console.log('VOTE_CONTRACT_ADDRESS =', voteAddress);
  console.log('NFT_CONTRACT_ADDRESS  =', nftAddress);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
