import { d as db, l as landlordProfiles } from './db-B3IBLKz5.js';
import { eq } from 'drizzle-orm';
import crypto from 'crypto';

//#region src/lib/server/secrets.ts
var RAW_KEY = process.env.PAYOS_ENC_KEY ?? "";
function getKey() {
	if (!RAW_KEY) throw new Error("Chưa cấu hình PAYOS_ENC_KEY để mã hóa khóa PayOS");
	const buf = Buffer.from(RAW_KEY, "base64");
	return buf.length === 32 ? buf : crypto.createHash("sha256").update(RAW_KEY).digest();
}
function encryptSecret(plain) {
	const iv = crypto.randomBytes(12);
	const cipher = crypto.createCipheriv("aes-256-gcm", getKey(), iv);
	const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${iv.toString("base64")}.${tag.toString("base64")}.${enc.toString("base64")}`;
}
function decryptSecret(payload) {
	const [ivB64, tagB64, dataB64] = payload.split(".");
	if (!ivB64 || !tagB64 || !dataB64) throw new Error("Dữ liệu mã hóa PayOS không hợp lệ");
	const decipher = crypto.createDecipheriv("aes-256-gcm", getKey(), Buffer.from(ivB64, "base64"));
	decipher.setAuthTag(Buffer.from(tagB64, "base64"));
	return Buffer.concat([decipher.update(Buffer.from(dataB64, "base64")), decipher.final()]).toString("utf8");
}
function tryDecryptSecret(payload) {
	if (!payload) return null;
	try {
		return decryptSecret(payload);
	} catch {
		return null;
	}
}
//#endregion
//#region src/lib/server/payos.ts
var PAYOS_API_BASE = process.env.PAYOS_API_BASE ?? "https://api-merchant.payos.vn";
function getPlatformPayOSConfig() {
	const clientId = process.env.PAYOS_CLIENT_ID;
	const apiKey = process.env.PAYOS_API_KEY;
	const checksumKey = process.env.PAYOS_CHECKSUM_KEY;
	if (!clientId || !apiKey || !checksumKey) return null;
	return {
		clientId,
		apiKey,
		checksumKey
	};
}
async function resolvePayOSConfig(ctx) {
	if (ctx.scope === "subscription") return getPlatformPayOSConfig();
	const profile = await db.query.landlordProfiles.findFirst({
		where: eq(landlordProfiles.id, ctx.landlordId),
		columns: {
			payosClientId: true,
			payosApiKeyEnc: true,
			payosChecksumKeyEnc: true
		}
	});
	if (!profile?.payosClientId || !profile.payosApiKeyEnc || !profile.payosChecksumKeyEnc) return null;
	const apiKey = tryDecryptSecret(profile.payosApiKeyEnc);
	const checksumKey = tryDecryptSecret(profile.payosChecksumKeyEnc);
	if (!apiKey || !checksumKey) return null;
	return {
		clientId: profile.payosClientId,
		apiKey,
		checksumKey
	};
}
function getPublicOrigin() {
	return process.env.PUBLIC_APP_ORIGIN ?? process.env.ORIGIN ?? "http://localhost:5173";
}
function normalizeSignatureValue(value) {
	if (value === null || value === void 0 || value === "undefined" || value === "null") return "";
	if (Array.isArray(value)) return JSON.stringify(value.map((item) => item && typeof item === "object" && !Array.isArray(item) ? sortObjectByKey(item) : item));
	return String(value);
}
function sortObjectByKey(object) {
	return Object.keys(object).sort().reduce((acc, key) => {
		acc[key] = object[key];
		return acc;
	}, {});
}
function createPayOSSignature(data, checksumKey) {
	const sorted = sortObjectByKey(data);
	const query = Object.keys(sorted).filter((key) => sorted[key] !== void 0).map((key) => `${key}=${normalizeSignatureValue(sorted[key])}`).join("&");
	return crypto.createHmac("sha256", checksumKey).update(query).digest("hex");
}
function verifyPayOSWebhook(data, signature, checksumKey) {
	const expected = createPayOSSignature(data, checksumKey);
	const a = Buffer.from(signature);
	const b = Buffer.from(expected);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}
function makePayOSOrderCode(seed) {
	return 1e8 + crypto.createHash("sha256").update(seed).digest().readUInt32BE(0) % 9e8;
}
async function createPayOSPaymentLink(config, input) {
	const origin = getPublicOrigin().replace(/\/$/, "");
	const cancelUrl = `${origin}/tenant?payment=cancel&invoice=${encodeURIComponent(input.invoiceId)}`;
	const returnUrl = `${origin}/tenant?payment=success&invoice=${encodeURIComponent(input.invoiceId)}`;
	const amount = Math.round(input.amount);
	const description = input.description.slice(0, 25);
	const signature = createPayOSSignature({
		amount,
		cancelUrl,
		description,
		orderCode: input.orderCode,
		returnUrl
	}, config.checksumKey);
	const payload = {
		orderCode: input.orderCode,
		amount,
		description,
		buyerName: input.buyerName,
		buyerPhone: input.buyerPhone,
		items: input.items.map((item) => ({
			name: item.name.slice(0, 120),
			quantity: item.quantity,
			price: Math.round(item.price)
		})),
		cancelUrl,
		returnUrl,
		signature
	};
	const response = await fetch(`${PAYOS_API_BASE}/v2/payment-requests`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-client-id": config.clientId,
			"x-api-key": config.apiKey
		},
		body: JSON.stringify(payload)
	});
	const body = await response.json();
	if (!response.ok || body.code !== "00") throw new Error(body.desc || "Không tạo được link thanh toán PayOS");
	if (body.signature) {
		const expected = createPayOSSignature(body.data ?? {}, config.checksumKey);
		const a = Buffer.from(String(body.signature));
		const b = Buffer.from(expected);
		if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new Error("Chữ ký phản hồi PayOS không khớp");
	}
	return body.data;
}
async function confirmPayOSWebhook(config, webhookUrl) {
	const response = await fetch(`${PAYOS_API_BASE}/confirm-webhook`, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
			"x-client-id": config.clientId,
			"x-api-key": config.apiKey
		},
		body: JSON.stringify({ webhookUrl })
	});
	const body = await response.json().catch(() => ({}));
	if (!response.ok || body.code !== void 0 && body.code !== "00") throw new Error(body.desc || "PayOS không xác nhận được webhook URL (kiểm tra lại key hoặc URL công khai)");
	return true;
}

export { confirmPayOSWebhook as a, createPayOSPaymentLink as c, encryptSecret as e, getPlatformPayOSConfig as g, makePayOSOrderCode as m, resolvePayOSConfig as r, verifyPayOSWebhook as v };
//# sourceMappingURL=payos-DjyfWihO.js.map
