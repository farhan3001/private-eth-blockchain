// Import required libraries
const { Web3 } = require('web3');
const express = require('express');
const app = express();
const path = require('path');

// Load the compiled contract JSON
const PaymentContract = require(path.resolve(__dirname, '../Blockchain-Eth-Payment/build/contracts/Payment.json'));

// Middleware to parse JSON bodies in POST requests
app.use(express.json());

// Initialize Web3 with HttpProvider to connect to the local Ethereum node (Ganache in your case)
const web3 = new Web3('http://127.0.0.1:8545'); // Connect to the local Ethereum node


function convertBigIntProperties(obj) {
    const jsonString = JSON.stringify(obj, (key, value) =>
      typeof value === 'bigint' ? value.toString() : value
    );
    return JSON.parse(jsonString);
  }
// Function to get the contract instance
async function getContract() {
    // Get the network ID of the local node (Ganache)
    const networkId = await web3.eth.net.getId();
    
    // Check if the contract is deployed on the current network
    const deployedNetwork = PaymentContract.networks[networkId];
    const contractAddress = deployedNetwork && deployedNetwork.address;
    
    // If contract not deployed, throw an error
    if (!contractAddress) {
        throw new Error('Contract not deployed to the detected network.');
    }

    // Return the contract instance
    const contract = new web3.eth.Contract(PaymentContract.abi, contractAddress);
    return contract;
}

// API route to send payment
app.post('/sendPayment', async (req, res) => {
    const { sender, privateKey, receiver, amount } = req.body;

    try {

        // Get contract instance
        const contract = await getContract();

        // Prepare the transaction data to call the sendPayment method in the contract
        const tx = contract.methods.sendPayment(receiver).encodeABI();
        console.log("Trx: ", tx);

        // Get nonce
        const _nonce = await web3.eth.getTransactionCount(sender);
        console.log("Nonce: ", _nonce);

        // Convert the amount to big int
        const valueInWei = web3.utils.toWei(amount, 'ether');

        // Get the gas estimate for the transaction
        const gasEstimate = await web3.eth.estimateGas({
            to: receiver,
            data: contract.methods.sendPayment(receiver).encodeABI(),
            value: valueInWei
        });
        console.log("Gas Estimate: ", gasEstimate);

        // Check sender balance
        const senderBalance = await web3.eth.getBalance(sender);
        if (parseInt(senderBalance) < parseInt(valueInWei) + parseInt(gasEstimate) * 2000000000) {
            return res.status(400).json({ error: 'Insufficient funds to send transaction' });
        }
        console.log("Sender Balance: ", web3.utils.fromWei(senderBalance, 'ether'), "ETH");

        // Fetch current gas fee data for EIP-1559
        const gasData = await web3.eth.getGasPrice();
        const maxPriorityFeePerGas = gasData; // You can set a fixed value, e.g., 2 gwei
        const maxFeePerGas = Number(gasData) * 2;    // You can set a fixed value, e.g., 4 gwei

        console.log("Max Fee Per Gas: ", maxFeePerGas);
        console.log("Max Priority Fee Per Gas: ", maxPriorityFeePerGas);

        // Create transaction data with EIP-1559 fields
        const txData = {
            from: sender,
            to: receiver,
            data: tx,
            value: valueInWei,
            gas: gasEstimate,
            maxFeePerGas: maxFeePerGas,
            maxPriorityFeePerGas: maxPriorityFeePerGas,
            nonce: _nonce,
            type: '2'  // EIP-1559 transaction type
        };

        // Sign the transaction with the sender's private key
        const signedTx = await web3.eth.accounts.signTransaction(txData, privateKey);

        // Send the signed transaction
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction);
        
        // Respond with the transaction receipt
        const receiptWithBigIntAsString = convertBigIntProperties(receipt);
        res.status(200).json(receiptWithBigIntAsString);

    } catch (error) {
        // If there's an error, send a response with the error message
        res.status(400).json({ error: error.message });
    }
});

// Get All Transactions (GET)
app.get('/transactions', async (req, res) => {
    try {

        const latestBlockNumber = Number(await web3.eth.getBlockNumber());
        const allTransactions = [];

        for (let i = 0; i <= latestBlockNumber; i++) {
            const block = await web3.eth.getBlock(i, true);
            allTransactions.push(...block.transactions);
        }

        const data = convertBigIntProperties(allTransactions);

        const response = {
            success: true,
            data
        };

        res.json(response);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get Specific Transaction by Hash (GET)
app.get('/transaction/:hash', async (req, res) => {
    const { hash } = req.params;
    try {

        await getContract();

        const transactionBigInt = await web3.eth.getTransaction(hash);
        transaction = convertBigIntProperties(transactionBigInt);


        const receiptBigInt = await web3.eth.getTransactionReceipt(hash);
        receipt = convertBigIntProperties(receiptBigInt);


        if (transactionBigInt) {
            const response = {
                success: true,
                data: {
                    transaction,
                    receipt,
                },
            };

            res.json(response);
        } else {
            res.status(404).json({ error: 'Transaction not found' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: error.message });
    }
});

// Start the server
app.listen(3000, () => {
    console.log('Server running on port 3000');
});
