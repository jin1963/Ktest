let web3;
let userAddress;
let contract;
let tokenContract;

async function connectWallet() {
  if (typeof window.ethereum === 'undefined') {
    alert("Please install MetaMask or Bitget Wallet");
    return;
  }

  try {
    await window.ethereum.request({ method: 'eth_requestAccounts' });
    web3 = new Web3(window.ethereum);

    const accounts = await web3.eth.getAccounts();
    userAddress = accounts[0];

    const chainId = await web3.eth.getChainId();
    if (chainId !== 56) {
      alert("Please switch to BNB Smart Chain (Chain ID 56)");
      return;
    }

    document.getElementById("walletStatus").innerHTML = `🟢 Connected: ${userAddress}`;
    contract = new web3.eth.Contract(stakingABI, stakingContractAddress);
    tokenContract = new web3.eth.Contract(erc20ABI, tokenAddress);

    await fetchStakes();

  } catch (error) {
    console.error(error);
    alert("❌ Failed to connect wallet");
  }
}

async function stake() {
  if (!web3 || !userAddress) {
    alert("Please connect your wallet first.");
    return;
  }

  const amount = document.getElementById("stakeAmount").value;
  const parsedAmount = web3.utils.toWei(amount, 'ether');

  try {
    await tokenContract.methods.approve(stakingContractAddress, parsedAmount).send({ from: userAddress });

    await contract.methods.stake(parsedAmount).send({ from: userAddress });

    alert("✅ Stake successful!");
    await fetchStakes();
  } catch (error) {
    console.error(error);
    alert("❌ Stake failed.");
  }
}

async function fetchStakes() {
  const container = document.getElementById("stakeList");
  container.innerHTML = "";

  try {
    const stakeCount = await contract.methods.getStakeCount(userAddress).call();

    if (stakeCount == 0) {
      container.innerHTML = "<p>No stakes yet.</p>";
      return;
    }

    for (let i = 0; i < stakeCount; i++) {
      const stake = await contract.methods.stakes(userAddress, i).call();

      const amount = web3.utils.fromWei(stake.amount, 'ether');
      const start = new Date(stake.startTime * 1000).toLocaleString();
      const reward = web3.utils.fromWei(stake.reward.toString(), 'ether');

      const stakeDiv = document.createElement("div");
      stakeDiv.className = "stake-entry";
      stakeDiv.innerHTML = `
        <p><strong>Index:</strong> ${i}</p>
        <p><strong>Amount:</strong> ${amount} KJC</p>
        <p><strong>Start Time:</strong> ${start}</p>
        <p><strong>Reward:</strong> ${reward} KJC</p>
        <button onclick="claim(${i})">Claim</button>
        <button onclick="unstake(${i})">Unstake</button>
        <hr/>
      `;
      container.appendChild(stakeDiv);
    }
  } catch (error) {
    console.error(error);
    container.innerHTML = "<p>Failed to load stakes.</p>";
  }
}

async function claim(index) {
  try {
    await contract.methods.claimReward(index).send({ from: userAddress });
    alert("✅ Reward claimed!");
    await fetchStakes();
  } catch (error) {
    console.error(error);
    alert("❌ Claim failed.");
  }
}

async function unstake(index) {
  try {
    await contract.methods.unstake(index).send({ from: userAddress });
    alert("✅ Unstaked successfully!");
    await fetchStakes();
  } catch (error) {
    console.error(error);
    alert("❌ Unstake failed.");
  }
}
