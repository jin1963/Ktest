let provider, signer, account, stakingContract, tokenContract;

async function switchToBSC() {
  const bscChainId = "0x38"; // BNB Chain
  try {
    await window.ethereum.request({
      method: "wallet_switchEthereumChain",
      params: [{ chainId: bscChainId }],
    });
  } catch (switchError) {
    if (switchError.code === 4902) {
      try {
        await window.ethereum.request({
          method: "wallet_addEthereumChain",
          params: [{
            chainId: bscChainId,
            chainName: "BNB Smart Chain",
            nativeCurrency: { name: "BNB", symbol: "BNB", decimals: 18 },
            rpcUrls: ["https://bsc-dataseed.binance.org/"],
            blockExplorerUrls: ["https://bscscan.com"]
          }]
        });
      } catch (addError) {
        console.error("❌ Add BSC failed", addError);
      }
    } else {
      console.error("❌ Switch chain failed", switchError);
    }
  }
}

async function connectWallet() {
  if (window.ethereum) {
    await switchToBSC();

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
    alert("⚠️ กรุณาติดตั้ง MetaMask หรือ Bitget Wallet");
  }
}

async function stakeTokens() {
  const amount = document.getElementById("stakeAmount").value;
  const period = parseInt(document.getElementById("lockPeriod").value);

  if (!amount || !period) return alert("กรุณากรอกจำนวนและเลือกระยะเวลา");

  await switchToBSC();

  const web3 = new Web3(window.ethereum);
  const token = new web3.eth.Contract(erc20ABI, tokenAddress);
  const staking = new web3.eth.Contract(stakingABI, stakingContractAddress);
  const stakeAmount = web3.utils.toWei(amount, "ether");

  try {
    console.log("🔁 กำลังอนุมัติ...");
    await token.methods.approve(stakingContractAddress, stakeAmount).send({ from: account });
    console.log("✅ อนุมัติสำเร็จ");

    console.log("🚀 กำลัง stake...");
    await staking.methods.stake(stakeAmount, period).send({ from: account });
    console.log("✅ Stake สำเร็จ");

    alert("✅ Stake สำเร็จแล้ว!");
    loadStakes();
  } catch (err) {
    console.error("❌ ล้มเหลว:", err);
    alert("❌ ไม่สามารถ stake ได้ โปรดตรวจสอบ Bitget หรือค่าธรรมเนียม");
  }
}

async function claimReward(index) {
  const tx = await stakingContract.claimReward(index);
  await tx.wait();
  alert(`✅ เคลมรางวัลสำเร็จ (#${index})`);
  loadStakes();
}

async function unstake(index) {
  const tx = await stakingContract.unstake(index);
  await tx.wait();
  alert(`✅ ยกเลิก stake สำเร็จ (#${index})`);
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
