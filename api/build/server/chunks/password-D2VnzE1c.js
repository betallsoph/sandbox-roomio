import crypto from 'crypto';
import bcrypt from 'bcryptjs';

//#region src/lib/server/password.ts
var BCRYPT_ROUNDS = 10;
var LEGACY_SHA256 = /^[a-f0-9]{64}$/;
async function hashPassword(password) {
	return bcrypt.hash(password, BCRYPT_ROUNDS);
}
function sha256(password) {
	return crypto.createHash("sha256").update(password).digest("hex");
}
async function verifyPassword(password, storedHash) {
	if (LEGACY_SHA256.test(storedHash)) {
		const valid = sha256(password) === storedHash;
		return {
			valid,
			needsRehash: valid
		};
	}
	return {
		valid: await bcrypt.compare(password, storedHash),
		needsRehash: false
	};
}

export { hashPassword as h, verifyPassword as v };
//# sourceMappingURL=password-D2VnzE1c.js.map
