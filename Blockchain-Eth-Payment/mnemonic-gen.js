const bip39 = require('bip39');

// Generate a 12-word mnemonic
const mnemonic = bip39.generateMnemonic();
console.log('Generated Mnemonic:', mnemonic);