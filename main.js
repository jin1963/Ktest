// main.js - เวอร์ชันใช้งานได้กับ Bitget Wallet และระบบ approve + stake ผ่าน Web3.js

const contractAddress = "0x92dCdA45eE76Aa8Af97DaB8bE8e163d3CECa8636";
const tokenAddress = "0xd479ae350dc24168e8db863c5413c35fb2044ecd";
const chainId = 56;

let web3;
let userAccount;

window.addEventListener("load", async () => {
  if (window.ethereum) {
    web3 = new Web3(window.ethereum);
    await connectWallet();
  } else {
    alert("Please install MetaMask or a compatible wallet like Bitget.");
  }
});

async function connectWallet() {
  try {
    const accounts = await ethereum.request({ method: "eth_requestAccounts" });
    userAccount = accounts[0];
    document.getElementById("wallet-address").innerHTML =
      "Wallet: ✅<br>" + userAccount;
    await loadStakes();
  } catch (err) {
    console.error(err);
  }
}

document.getElementById("connectBtn").addEventListener("click", connectWallet);
document.getElementById("stakeBtn").addEventListener("click", stakeKJC);

async function stakeKJC() {
  const amount = document.getElementById("stakeAmount").value;
  const lockDays = document.getElementById("lockDays").value;
  if (!amount || !lockDays) {
    alert("กรุณากรอกจำนวนและเลือกระยะเวลา");
    return;
  }

  const stakeAmount = web3.utils.toWei(amount, "ether");

  const tokenContract = new web3.eth.Contract(erc20Abi, tokenAddress);
  const stakingContract = new web3.eth.Contract(contractAbi, contractAddress);

  try {
    await tokenContract.methods
      .approve(contractAddress, stakeAmount)
      .send({ from: userAccount });

    stakingContract.methods
      .stake(stakeAmount, parseInt(lockDays))
      .send({ from: userAccount })
      .on("receipt", (receipt) => {
        alert("✅ Stake สำเร็จ!");
        loadStakes();
      });
  } catch (err) {
    console.error("Stake error:", err);
    alert("เกิดข้อผิดพลาดในการ stake");
  }
}

async function loadStakes() {
  const stakingContract = new web3.eth.Contract(contractAbi, contractAddress);
  const stakes = await stakingContract.methods.getStakes(userAccount).call();
  const container = document.getElementById("stakesContainer");
  container.innerHTML = "";

  stakes.forEach((s, index) => {
    const amount = web3.utils.fromWei(s.amount, "ether");
    const start = new Date(s.startTime * 1000).toLocaleDateString();
    const nextClaim = new Date(s.lastClaimTime * 1000 + 15 * 24 * 60 * 60 * 1000).toLocaleDateString();
    const lock = s.lockPeriod / 86400;

    const div = document.createElement("div");
    div.className = "stake-item";
    div.innerHTML = `
      <p>💰 Amount: ${amount} KJC</p>
      <p>📆 Start: ${start}</p>
      <p>🔒 Lock: ${lock} วัน</p>
      <p>🕒 Next Claim: ${nextClaim}</p>
      <button onclick="claimReward(${index})">🎁 Claim</button>
      <button onclick="unstake(${index})">❌ Unstake</button>
    `;
    container.appendChild(div);
  });
}

async function claimReward(index) {
  const stakingContract = new web3.eth.Contract(contractAbi, contractAddress);
  try {
    await stakingContract.methods
      .claimReward(index)
      .send({ from: userAccount })
      .on("receipt", () => {
        alert("✅ Claim สำเร็จ");
        loadStakes();
      });
  } catch (err) {
    console.error(err);
    alert("Claim ไม่สำเร็จ");
  }
}

async function unstake(index) {
  const stakingContract = new web3.eth.Contract(contractAbi, contractAddress);
  try {
    await stakingContract.methods
      .unstake(index)
      .send({ from: userAccount })
      .on("receipt", () => {
        alert("✅ Unstake สำเร็จ");
        loadStakes();
      });
  } catch (err) {
    console.error(err);
    alert("Unstake ไม่สำเร็จ");
  }
}
