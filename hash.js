// Use: npm run hash -- "TumharaPassword"
const bcrypt = require('bcryptjs');
const pass = process.argv[2];
if (!pass) { console.log('Password do: npm run hash -- "TumharaPassword"'); process.exit(1); }
console.log(bcrypt.hashSync(pass, 10));
