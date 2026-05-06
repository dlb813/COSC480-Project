let userAddress = '';

document.addEventListener('DOMContentLoaded', async function () {
  await loadWalletInfo();
  await loadHouseInfo();
  document.getElementById('coinflipForm').addEventListener('submit', submitBet);
});

async function loadWalletInfo() {
  try {
    const walletResponse = await fetch('/getWallet');
    const walletData = await walletResponse.json();

    if (walletData.success && walletData.walletAddress) {
      userAddress = walletData.walletAddress;
      document.getElementById('playerAddress').textContent = walletData.walletAddress;
    } else {
      showMessage('No wallet found for this account. Create one in Wallet page first.', 'error');
      return;
    }

    const balanceResponse = await fetch('/getWalletBalance');
    const balanceData = await balanceResponse.json();
    if (balanceData.success) {
      document.getElementById('playerBalance').textContent = Number(balanceData.balanceEther).toFixed(4) + ' ETH';
    }
  } catch (error) {
    showMessage('Error loading wallet: ' + error.message, 'error');
  }
}

async function loadHouseInfo() {
  try {
    const response = await fetch('/coinflipConfig');
    const data = await response.json();
    if (!data.success) {
      showMessage(data.error || 'Could not load house config.', 'error');
      return;
    }

    document.getElementById('houseAddress').textContent = data.houseAddress;
    document.getElementById('houseBalance').textContent = Number(data.houseBalanceEther).toFixed(4) + ' ETH';
    document.getElementById('maxBet').textContent = Number(data.maxBetEther).toFixed(4) + ' ETH';
  } catch (error) {
    showMessage('Error loading house info: ' + error.message, 'error');
  }
}

async function submitBet(e) {
  e.preventDefault();

  const amount = Number(document.getElementById('betAmount').value);
  if (!Number.isFinite(amount) || amount <= 0) {
    showMessage('Enter a valid bet amount.', 'error');
    return;
  }

  const choice = document.querySelector('input[name="choice"]:checked').value;
  const btn = document.getElementById('betBtn');
  const flipAnimationCard = document.getElementById('flipAnimationCard');
  const original = btn.textContent;
  btn.disabled = true;
  btn.innerHTML = '<span class="loading"></span>Flipping...';
  flipAnimationCard.style.display = 'grid';

  try {
    const response = await fetch('/coinflipBet', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ choice, amount })
    });

    const data = await response.json();
    if (!data.success) {
      showMessage(data.error || 'Bet failed', 'error');
      return;
    }

    document.getElementById('resultCard').style.display = 'grid';
    document.getElementById('flipResult').textContent = data.flip;
    document.getElementById('winLoseResult').textContent = data.userWon ? 'You won' : 'You lost';
    document.getElementById('txHash').textContent = data.transactionHash;

    showMessage(data.message, data.userWon ? 'success' : 'info');

    setTimeout(async () => {
      await loadWalletInfo();
      await loadHouseInfo();
    }, 1200);
  } catch (error) {
    showMessage('Error: ' + error.message, 'error');
  } finally {
    flipAnimationCard.style.display = 'none';
    btn.disabled = false;
    btn.textContent = original;
  }
}

function showMessage(message, type) {
  const messageDiv = document.getElementById('message');
  messageDiv.textContent = message;
  messageDiv.className = 'message ' + type;
}
