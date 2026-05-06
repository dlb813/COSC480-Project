let userAddress;

// Load initial data on page load
document.addEventListener('DOMContentLoaded', async function() {
    loadWalletInfo();
    document.getElementById('transferForm').addEventListener('submit', handleTransferSubmit);
});

async function loadWalletInfo() {
    try {
        const response = await fetch('/getWallet');
        const data = await response.json();

        if (data.success && data.walletAddress) {
            userAddress = data.walletAddress;
            document.getElementById('senderAddress').textContent = data.walletAddress;
        } else {
            showMessage('No wallet found. Please create a wallet first.', 'error');
        }

        loadBalance();
    } catch (error) {
        showMessage('Error loading wallet info: ' + error.message, 'error');
        console.error('Error:', error);
    }
}

async function loadBalance() {
    try {
        const response = await fetch('/getWalletBalance');
        const data = await response.json();

        if (data.success) {
            const balanceEth = parseFloat(data.balanceEther).toFixed(4);
            document.getElementById('availableBalance').textContent = balanceEth + ' ETH';
        } else {
            const errorMsg = data.error || 'Unable to load balance';
            console.error('Error getting wallet balance:', errorMsg);
            document.getElementById('availableBalance').textContent = 'Error loading balance';
            showMessage(errorMsg, 'error');
        }
    } catch (error) {
        console.error('Error loading balance:', error);
        document.getElementById('availableBalance').textContent = 'Error loading balance';
        showMessage('Error getting wallet balance: ' + error.message, 'error');
    }
}

function toggleRecipientInput() {
    const recipientType = document.querySelector('input[name="recipientType"]:checked').value;

    if (recipientType === 'address') {
        document.getElementById('addressInput').classList.add('active');
        document.getElementById('userInput').classList.remove('active');
    } else {
        document.getElementById('userInput').classList.add('active');
        document.getElementById('addressInput').classList.remove('active');
    }

    clearValidation();
}

async function validateRecipient() {
    const recipientType = document.querySelector('input[name="recipientType"]:checked').value;
    const validationDiv = document.querySelector('.recipient-input.active .recipient-validation');

    let recipient = '';
    let isValid = false;
    let validationMessage = '';

    if (recipientType === 'address') {
        recipient = document.getElementById('recipientAddress').value.trim();

        try {
            const response = await fetch('/validateAddress', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ address: recipient })
            });

            const data = await response.json();
            isValid = data.valid;
            validationMessage = isValid ? 'Valid Ethereum address' : 'Invalid Ethereum address';
        } catch (error) {
            isValid = false;
            validationMessage = 'Error validating address';
        }
    } else {
        recipient = document.getElementById('recipientUsername').value.trim();

        if (recipient.length > 0) {
            isValid = true;
            validationMessage = 'Username will be resolved by server';
        } else {
            validationMessage = 'Please enter a username';
        }
    }

    if (validationDiv) {
        validationDiv.textContent = validationMessage;
        validationDiv.className = 'recipient-validation ' + (isValid ? 'valid' : 'invalid');
    }

    updateSummary();
    return isValid;
}

function clearValidation() {
    document.querySelectorAll('.recipient-validation').forEach(el => {
        el.textContent = '';
        el.className = 'recipient-validation';
    });
}

function updateSummary() {
    const recipientType = document.querySelector('input[name="recipientType"]:checked').value;
    const amount = document.getElementById('amount').value;
    const summary = document.getElementById('transactionSummary');

    let recipient = '';

    if (recipientType === 'address') {
        recipient = document.getElementById('recipientAddress').value.trim();
    } else {
        recipient = document.getElementById('recipientUsername').value.trim();
    }

    if (recipient && amount) {
        document.getElementById('summaryTo').textContent = recipient;
        document.getElementById('summaryAmount').textContent = amount + ' ETH';
        summary.classList.add('show');
    } else {
        summary.classList.remove('show');
    }
}

async function handleTransferSubmit(e) {
    e.preventDefault();

    if (!userAddress) {
        showMessage('No sender wallet found for this account', 'error');
        return;
    }

    if (!await validateRecipient()) {
        showMessage('Please provide a valid recipient', 'error');
        return;
    }

    const amount = document.getElementById('amount').value;
    if (!amount || Number(amount) <= 0) {
        showMessage('Please enter a valid amount', 'error');
        return;
    }

    const recipientType = document.querySelector('input[name="recipientType"]:checked').value;
    let recipientInput = '';

    if (recipientType === 'address') {
        recipientInput = document.getElementById('recipientAddress').value.trim();
    } else {
        recipientInput = document.getElementById('recipientUsername').value.trim();
    }

    const submitBtn = document.getElementById('submitBtn');
    const originalText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<span class="loading"></span> Sending transaction...';

    try {
        const transferResponse = await fetch('/sendEther', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                senderAddress: userAddress,
                recipientInput: recipientInput,
                amount: amount
            })
        });

        const transferData = await transferResponse.json();

        if (transferData.success) {
            showMessage('Transfer confirmed! Hash: ' + transferData.transactionHash, 'success');
            document.getElementById('transferForm').reset();
            document.getElementById('transactionSummary').classList.remove('show');
            setTimeout(() => {
                loadBalance();
            }, 1000);
        } else {
            showMessage(transferData.error || 'Failed to send transfer', 'error');
        }
    } catch (error) {
        showMessage('Error: ' + error.message, 'error');
        console.error('Error:', error);
    } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = originalText;
    }
}

function goBack() {
    window.location.href = '/wallet';
}

function showMessage(message, type) {
    const messageDiv = document.getElementById('message');
    messageDiv.textContent = message;
    messageDiv.className = 'message ' + type;

    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    if (type === 'success' || type === 'info') {
        setTimeout(() => {
            messageDiv.className = 'message';
        }, 5000);
    }
}
