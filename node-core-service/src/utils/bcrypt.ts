const bcrypt = require('bcrypt');

const SALT_ROUNDS = 12;

const hashPassword    = (password: string): Promise<string>                => bcrypt.hash(password, SALT_ROUNDS);
const comparePassword = (password: string, hash: string): Promise<boolean> => bcrypt.compare(password, hash);

module.exports = { hashPassword, comparePassword };
export {};
