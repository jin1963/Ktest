let provider, signer, account, stakingContract, tokenContract;

async function connectWallet() {
  if (window.ethereum) {
    provider = new ethers.providers.Web3Provider(window.ethereum);
    await window.ethereum.request({ method: "eth_requestAccounts" });
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

  const web3 = new Web3(window.ethereum); // ✅ Web3.js
  const token = new web3.eth.Contract(erc20ABI, tokenAddress);
  const staking = new web3.eth.Contract(stakingABI, stakingContractAddress);

  const stakeAmount = web3.utils.toWei(amount, "ether");

  try {
    await token.methods.approve(stakingContractAddress, stakeAmount).send({ from: account });
    await staking.methods.stake(stakeAmount, period).send({ from: account });

    alert("✅ Staked successfully via Web3.js");
    loadStakes();
  } catch (err) {
    console.error("❌ Stake failed:", err);
    alert("❌ Stake failed");
  }
}

async function claimReward(index) {
  const tx = await stakingContract.claimReward(index);
  await tx.wait();
  alert(`✅ Claimed reward for stake #${index}`);
  loadStakes();
}

async function unstake(index) {
  const tx = await stakingContract.unstake(index);
  await tx.wait();
  alert(`✅ Unstaked #${index}`);
  loadStakes();
}

async function loadStakes() {
  const stakes = await stakingContract.getStakes(account);
  const decimals = await tokenContract.decimals();
  const container = document.getElementById("yourStakes");
  container.innerHTML = "";

  stakes.forEach((s, i) => {
    const amount = ethers.utils.formatUnits(s.amount, decimals);
    const start = s.startTime.toNumber();
    const lock = s.lockPeriod.toNumber();
    const lastClaim = s.lastClaimTime.toNumber();

    const startDate = start > 0 ? new Date(start * 1000).toLocaleDateString("th-TH") : "-";
    const nextClaim = lastClaim > 0
      ? new Date((lastClaim + 15 * 86400) * 1000).toLocaleDateString("th-TH")
      : "-";
    const unlock = start > 0
      ? new Date((start + lock) * 1000).toLocaleDateString("th-TH")
      : "-";

    const claimed = s.claimed ? "✅" : "❌";

    container.innerHTML += `
      <div class="stake-box">
        <p><strong>Stake #${i}</strong></p>
        <p>Amount: ${amount} KJC</p>
        <p>Start: ${startDate}</p>
        <p>Lock: ${lock / 86400} วัน</p>
        <p>Next Claim: ${nextClaim}</p>
        <p>Unlocks: ${unlock}</p>
        <p>Claimed: ${claimed}</p>
        <button onclick="claimReward(${i})">Claim</button>
        <button onclick="unstake(${i})">Unstake</button>
      </div>
    `;
  });
}
