// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract Payment {
    event Transfer(address indexed sender, address indexed receiver, uint256 amount, uint256 batchIndex);
    event BatchFinalized(uint256 batchIndex);

    struct Transaction {
        address sender;
        address receiver;
        uint256 amount;
    }

    struct Batch {
        Transaction[] transactions;
        bool finalized; // Indicates if the batch has been finalized
    }

    uint256 public constant MAX_BATCH_SIZE = 10; // Limit of transactions per batch
    uint256 public currentBatchIndex; // Tracks the current batch index
    mapping(uint256 => Batch) public batches; // Stores all batches by index

    function sendPayment(address payable _receiver) public payable {
        require(msg.value > 0, "Amount must be greater than zero");

        Batch storage currentBatch = batches[currentBatchIndex];

        // Store transaction in the current batch
        currentBatch.transactions.push(Transaction({
            sender: msg.sender,
            receiver: _receiver,
            amount: msg.value
        }));

        // Transfer funds
        _receiver.transfer(msg.value);

        emit Transfer(msg.sender, _receiver, msg.value, currentBatchIndex);

        // Finalize batch if it reaches the maximum size
        if (currentBatch.transactions.length == MAX_BATCH_SIZE) {
            currentBatch.finalized = true;
            emit BatchFinalized(currentBatchIndex);
            currentBatchIndex++; // Start a new batch
        }
    }
}
