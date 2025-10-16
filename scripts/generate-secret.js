const crypto = require('crypto');

console.log('\n🔐 Generating Encryption Secret...\n');
console.log('Add this to your .env.local file:\n');
console.log('ENCRYPTION_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('\n⚠️  Keep this secret safe! Never commit it to git!\n');

