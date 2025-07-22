let web3;
let contract;
let token;
let user;

window.addEventListener("load", async () => {
    if (window.ethereum) {
        web3 = new Web3(window.ethereum);
    } else {
        alert("MetaMask or Wallet Extension not detected!");
    }
});

document.getElementById("connectWallet").onclick = async () => {
    try {
        const accounts = await ethereum.request({ method: "eth_requestAccounts" });
        user = accounts[0];
        document.getElementById("walletStatus").innerText = "🟢 Connected: " + user;

        contract = new web3.eth.Contract(contractABI, contractAddress);
        token = new web3.eth.Contract(erc20ABI, tokenAddress);
    } catch (err) {
        console.error(err);
        alert("Failed to connect wallet");
    }
};

document.getElementById("stakeButton").onclick = async () => {
    const amount = document.getElementById("stakeAmount").value;
    if (!amount || !user) return alert("Connect wallet and enter amount");

    const decimals = await token.methods.decimals().call();
    const stakeAmount = web3.utils.toBN(amount).mul(web3.utils.toBN(10).pow(web3.utils.toBN(decimals)));

    try {
        await token.methods.approve(contractAddress, stakeAmount).send({ from: user });
        await contract.methods.stake(stakeAmount).send({ from: user });
        alert("Staked successfully!");
    } catch (err) {
        console.error(err);
        alert("Staking failed");
    }
};
