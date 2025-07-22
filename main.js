// main.js - Web3.js version compatible with Bitget and MetaMask

let web3, user, stakingContract, tokenContract;

const stakingContractAddress = "0x92dCdA45eE76Aa8Af97DaB8bE8e163d3CECa8636";
const tokenAddress = "0xd479ae350dc24168e8db863c5413c35fb2044ecd";
const chainId = 56;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
    stakingContract = new web3.eth.Contract(stakingAbi, stakingContractAddress);

    ethereum.on("accountsChanged", () => window.location.reload());
    ethereum.on("chainChanged", () => window.location.reload());

    document.getElementById("connectWallet").addEventListener("click", connectWallet);
    document.getElementById("stakeButton").addEventListener("click", stakeTokens);
  } else {
    alert("⚠️ Please install MetaMask or Bitget Wallet.");
  }
});

async function connectWallet() {
  const accounts = await ethereum.request({ method: "eth_requestAccounts" });
  user = accounts[0];

  const currentChainId = await ethereum.request({ method: "eth_chainId" });
  if (parseInt(currentChainId, 16) !== chainId) {
    await ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: "0x38" }],
    });
  }

  document.getElementById("walletAddress").innerText = `✅ ${user}`;
  document.getElementById("stakeSection").style.display = "block";
  loadStakes();
}

async function stakeTokens() {
  const amount = document.getElementById("stakeAmount").value;
  const period = parseInt(document.getElementById("lockPeriod").value);
  if (!amount || !period) return alert("Enter amount and lock period");

  const decimals = await tokenContract.methods.decimals().call();
  const stakeAmount = web3.utils.toWei(amount, "ether");

  try {
    await tokenContract.methods.approve(stakingContractAddress, stakeAmount).send({ from: user });
    await stakingContract.methods.stake(stakeAmount, period).send({ from: user })
      .on("receipt", () => {
        alert("✅ Staked successfully!");
        loadStakes();
      });
  } catch (e) {
    console.error("Stake failed:", e);
    alert("❌ Stake failed. See console.");
  }
}

async function claimReward(index) {
  try {
    await stakingContract.methods.claimReward(index).send({ from: user })
      .on("receipt", () => {
        alert(`✅ Reward claimed for stake #${index}`);
        loadStakes();
      });
  } catch (e) {
    console.error("Claim failed:", e);
    alert("❌ Claim failed. See console.");
  }
}

async function unstake(index) {
  try {
    await stakingContract.methods.unstake(index).send({ from: user })
      .on("receipt", () => {
        alert(`✅ Unstaked #${index}`);
        loadStakes();
      });
  } catch (e) {
    console.error("Unstake failed:", e);
    alert("❌ Unstake failed. See console.");
  }
}

async function loadStakes() {
  const container = document.getElementById("yourStakes");
  container.innerHTML = "";

  try {
    const stakes = await stakingContract.methods.getStakes(user).call();
    const now = Math.floor(Date.now() / 1000);
    const decimals = await tokenContract.methods.decimals().call();

    stakes.forEach((s, i) => {
      const amount = web3.utils.fromWei(s.amount, "ether");
      const start = parseInt(s.startTime);
      const lock = parseInt(s.lockPeriod);
      const lastClaim = parseInt(s.lastClaimTime);

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

    if (stakes.length === 0) {
      container.innerHTML = "<p>No stakes found.</p>";
    }
  } catch (e) {
    console.error("Failed to load stakes:", e);
    container.innerHTML = "<p>Error loading stakes.</p>";
  }
}
