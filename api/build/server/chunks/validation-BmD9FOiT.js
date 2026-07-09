//#region src/lib/server/validation.ts
var ValidationError = class extends Error {
	constructor(message) {
		super(message);
		this.name = "ValidationError";
	}
};
function requiredString(value, field, max = 255) {
	if (typeof value !== "string" || !value.trim()) throw new ValidationError(`Thiếu ${field}`);
	const trimmed = value.trim();
	if (trimmed.length > max) throw new ValidationError(`${field} quá dài`);
	return trimmed;
}
function requiredEnum(value, field, allowed) {
	if (typeof value !== "string" || !allowed.includes(value)) throw new ValidationError(`${field} không hợp lệ`);
	return value;
}
function requiredEmail(value) {
	const email = requiredString(value, "email", 254).toLowerCase();
	if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new ValidationError("Email không hợp lệ");
	return email;
}
function requiredPhone(value) {
	const phone = requiredString(value, "số điện thoại", 20);
	if (!/^[0-9+\-\s.()]{8,20}$/.test(phone)) throw new ValidationError("Số điện thoại không hợp lệ");
	if (phone.replace(/\D/g, "").length < 8) throw new ValidationError("Số điện thoại không hợp lệ");
	return phone;
}
function phoneLookupDigits(value) {
	const digits = requiredPhone(value).replace(/\D/g, "");
	const variants = new Set([digits]);
	if (digits.startsWith("0084") && digits.length > 4) {
		const local = `0${digits.slice(4)}`;
		variants.add(`84${digits.slice(4)}`);
		variants.add(local);
	}
	if (digits.startsWith("84") && digits.length > 2) {
		variants.add(`0${digits.slice(2)}`);
		variants.add(`0084${digits.slice(2)}`);
	}
	if (digits.startsWith("0") && digits.length > 1) {
		variants.add(`84${digits.slice(1)}`);
		variants.add(`0084${digits.slice(1)}`);
	}
	return [...variants];
}

export { ValidationError as V, requiredString as a, requiredPhone as b, requiredEnum as c, phoneLookupDigits as p, requiredEmail as r };
//# sourceMappingURL=validation-BmD9FOiT.js.map
