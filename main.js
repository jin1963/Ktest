let provider, signer, account, stakingContract, tokenContract;

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await provider.send("eth_requestAccounts", []);
    signer = provider.getSigner();
    account = await signer.getAddress();
    stakingContract = new ethers.Contract(stakingContractAddress, stakingABI, signer);
    tokenContract = new ethers.Contract(tokenAddress, erc20ABI, signer);

    document.getElementById("walletAddress").innerText = `✅ ${account}`;
    document.getElementById("stakeSection").style.display = "block";
    loadStakes();
  } else {
    alert("Please install MetaMask or Bitget Wallet");
  }
}

async function stakeTokens() {
  const amount = document.getElementById("stakeAmount").value;
  const period = parseInt(document.getElementById("lockPeriod").value);

  if (!amount || !period) return alert("Please enter amount and select lock period");

  const decimals = await tokenContract.decimals();
  const stakeAmount = ethers.utils.parseUnits(amount, decimals);

  const allowance = await tokenContract.allowance(account, stakingContractAddress);
  if (allowance.lt(stakeAmount)) {
    const approveTx = await tokenContract.approve(stakingContractAddress, stakeAmount);
    await approveTx.wait();
  }

  const tx = await stakingContract.stake(stakeAmount, period);
  await tx.wait();

  alert("Staked successfully!");
  loadStakes();
}

async function claimReward(index) {
  const tx = await stakingContract.claimReward(index);
  await tx.wait();
  alert(`Reward claimed for stake #${index}`);
  loadStakes();
}

async function unstake(index) {
  const tx = await stakingContract.unstake(index);
  await tx.wait();
  alert(`Unstaked #${index}`);
  loadStakes();
}

async function loadStakes() {
  const stakes = await stakingContract.getStakes(account);
  const decimals = await tokenContract.decimals();
  const now = Math.floor(Date.now() / 1000);
  const container = document.getElementById("yourStakes");
  container.innerHTML = "";

  stakes.forEach((s, i) => {
    const amount = ethers.utils.formatUnits(s.amount, decimals);
    const start = new Date(s.startTime * 1000).toLocaleDateString();
    const nextClaim = new Date((s.lastClaimTime + 15 * 24 * 60 * 60) * 1000).toLocaleDateString();
    const unlock = new Date((s.startTime + s.lockPeriod) * 1000).toLocaleDateString();
    const claimed = s.claimed ? "✅" : "❌";

    container.innerHTML += `
      <div class="stake-box">
        <p><strong>Stake #${i}</strong></p>
        <p>Amount: ${amount} KJC</p>
        <p>Start: ${start}</p>
        <p>Lock: ${s.lockPeriod / 86400} วัน</p>
        <p>Next Claim: ${nextClaim}</p>
        <p>Unlocks: ${unlock}</p>
        <p>Claimed: ${claimed}</p>
        <button onclick="claimReward(${i})">Claim</button>
        <button onclick="unstake(${i})">Unstake</button>
      </div>
    `;
  });
}
