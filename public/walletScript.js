// Load wallet data on page load
document.addEventListener('DOMContentLoaded', function() {
    loadWalletData();
});

async function loadWalletData() {
    try {
        const response = await fetch('/getWallet');
        const data = await response.json();

        if (data.success && data.walletExists) {
            // Display wallet info
            document.getElementById('walletStatus').style.display = 'none';
            document.getElementById('walletDisplay').style.display = 'block';
            document.getElementById('walletAddress').textContent = data.walletAddress;
            
            // Load balance
            refreshBalance();
        } else {
            // Show create wallet option
            document.getElementById('walletStatus').style.display = 'none';
            document.getElementById('noWallet').style.display = 'block';
        }
    } catch (error) {
        showMessage('Error loading wallet: ' + error.message, 'error');
        console.error('Error:', error);
    }
}

async function createWallet() {
    const btn = document.querySelector('#noWallet .btn');
    btn.disabled = true;
    btn.innerHTML = '<span class="loading"></span>Creating wallet...';

    try {
        const response = await fetch('/createWallet', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showMessage('✅ Wallet address created successfully!', 'success');
            
            // Update display
            setTimeout(() => {
                document.getElementById('noWallet').style.display = 'none';
                document.getElementById('walletDisplay').style.display = 'block';
                document.getElementById('walletAddress').textContent = data.address;
                refreshBalance();
            }, 2000);
        } else {
            showMessage('Error creating wallet: ' + data.error, 'error');
            btn.disabled = false;
            btn.textContent = 'Create Wallet';
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Create Wallet';
        console.error('Error:', error);
    }
}

async function refreshBalance() {
    try {
        const response = await fetch('/getWalletBalance');
        const data = await response.json();

        if (data.success) {
            const balanceEth = parseFloat(data.balanceEther).toFixed(4);
            const balanceUsd = (parseFloat(balanceEth) * 2000).toFixed(2); // Assuming $2000/ETH for demo
            
            document.getElementById('balanceValue').textContent = balanceEth + ' ETH';
            document.getElementById('balanceUsd').textContent = '$' + balanceUsd;
            showMessage('✅ Balance updated successfully', 'success');
        } else {
            console.error('Balance fetch error:', data.error);
            showMessage('❌ Error loading balance: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error refreshing balance:', error);
        showMessage('❌ Error refreshing balance: ' + error.message, 'error');
    }
}

function goToTransfer() {
    window.location.href = '/transfer';
}

function copyToClipboard(elementId) {
    const element = document.getElementById(elementId);
    const text = element.textContent;
    
    navigator.clipboard.writeText(text).then(() => {
        showMessage('✅ Copied to clipboard!', 'success');
    }).catch(() => {
        showMessage('Failed to copy', 'error');
    });
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;
    
    if (type === 'success') {
        setTimeout(() => {
            messageDiv.className = 'message';
        }, 3000);
    }
}
