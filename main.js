window.addEventListener("DOMContentLoaded", async () => {
  const connectBtn = document.getElementById("connectWalletBtn");
  const walletAddressDisplay = document.getElementById("walletAddress");
  const stakeBtn = document.getElementById("stakeBtn");
  const stakeAmountInput = document.getElementById("stakeAmount");
  const lockPeriodSelect = document.getElementById("lockPeriod");
  const stakesContainer = document.getElementById("stakesContainer");

  let account;
  let web3;
  let kjcContract;
  let stakingContract;

  async function connectWallet() {
    if (window.ethereum) {
      web3 = new Web3(window.ethereum);
      try {
        const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
        account = accounts[0];
        walletAddressDisplay.textContent = `Wallet: ✅ ${account}`;
        connectBtn.disabled = true;

        kjcContract = new web3.eth.Contract(erc20Abi, tokenAddress);
        stakingContract = new web3.eth.Contract(stakingAbi, stakingContractAddress);

        loadStakes();
      } catch (error) {
        console.error("User denied wallet connection:", error);
      }
    } else {
      alert("Please install MetaMask or a compatible wallet.");
    }
  }

  async function stakeTokens() {
    const amount = stakeAmountInput.value;
    const lockPeriod = lockPeriodSelect.value;

    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      alert("Please enter a valid stake amount.");
      return;
    }

    const amountInWei = web3.utils.toWei(amount, "ether");

    try {
      // Step 1: Approve
      await kjcContract.methods
        .approve(stakingContractAddress, amountInWei)
        .send({ from: account });

      // Step 2: Stake
      await stakingContract.methods
        .stake(amountInWei, lockPeriod)
        .send({ from: account })
        .on("receipt", function (receipt) {
          alert("✅ Stake successful!");
          loadStakes();
        });
    } catch (error) {
      console.error("Staking error:", error);
      alert("❌ Staking failed. See console for details.");
    }
  }

  async function loadStakes() {
    stakesContainer.innerHTML = "";

    try {
      const stakes = await stakingContract.methods.getStakes(account).call();
      if (stakes.length === 0) {
        stakesContainer.innerHTML = "<p>No stakes found.</p>";
        return;
      }

      stakes.forEach((stake, index) => {
        const amount = web3.utils.fromWei(stake.amount, "ether");
        const start = new Date(stake.startTime * 1000).toLocaleString();
        const period = stake.lockPeriod / 86400; // days
        const rewards = web3.utils.fromWei(stake.reward.toString(), "ether");

        const stakeElement = document.createElement("div");
        stakeElement.className = "stake-entry";
        stakeElement.innerHTML = `
          <p><strong>Stake #${index + 1}</strong></p>
          <p>📦 Amount: ${amount} KJC</p>
          <p>📅 Start: ${start}</p>
          <p>⏳ Period: ${period} วัน</p>
          <p>💰 Reward: ${rewards} KJC</p>
          <button onclick="claimReward(${index})">Claim</button>
          <button onclick="unstake(${index})">Unstake</button>
        `;
        stakesContainer.appendChild(stakeElement);
      });
    } catch (error) {
      console.error("Failed to load stakes:", error);
    }
  }

  window.claimReward = async function (index) {
    try {
      await stakingContract.methods
        .claimReward(index)
        .send({ from: account })
        .on("receipt", function () {
          alert("🎉 Reward claimed!");
          loadStakes();
        });
    } catch (error) {
      console.error("Claim error:", error);
      alert("❌ Claim failed.");
    }
  };

  window.unstake = async function (index) {
    try {
      await stakingContract.methods
        .unstake(index)
        .send({ from: account })
        .on("receipt", function () {
          alert("🪙 Unstaked successfully!");
          loadStakes();
        });
    } catch (error) {
      console.error("Unstake error:", error);
      alert("❌ Unstake failed.");
    }
  };

  connectBtn.addEventListener("click", connectWallet);
  stakeBtn.addEventListener("click", stakeTokens);
});
