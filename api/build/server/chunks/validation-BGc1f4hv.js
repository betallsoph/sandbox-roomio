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
	return phone;
}

export { ValidationError as V, requiredPhone as a, requiredString as b, requiredEnum as c, requiredEmail as r };
//# sourceMappingURL=validation-BGc1f4hv.js.map
