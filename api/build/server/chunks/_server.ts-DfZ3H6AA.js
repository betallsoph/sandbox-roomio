import { e as errorMessage } from './api-BHH2biX8.js';
import { j as json } from './index-CLnuRv4X.js';
import crypto from 'crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import './index-DBqjc0Yf.js';

//#region src/lib/server/r2.ts
var DEFAULT_MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
var DEFAULT_EXPIRES_SECONDS = 300;
var EXT_BY_TYPE = {
	"image/jpeg": "jpg",
	"image/png": "png",
	"image/webp": "webp",
	"application/pdf": "pdf"
};
var PURPOSE_PREFIX = {
	"meter-reading": "meters",
	"maintenance-request": "maintenance",
	"tenant-document": "tenant-documents",
	"payment-proof": "payment-proofs",
	contract: "contracts",
	"room-asset": "room-assets"
};
var R2_UPLOAD_PURPOSES = Object.keys(PURPOSE_PREFIX);
var cachedClient = null;
function requiredEnv(name) {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`Thiếu biến môi trường ${name}`);
	return value;
}
function parsePositiveInt(value, fallback) {
	const parsed = Number(value);
	return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback;
}
function normalizeAccountId(value) {
	if (!/^[a-f0-9]{32}$/i.test(value)) throw new Error("R2_ACCOUNT_ID không hợp lệ; chỉ nhập Account ID, không nhập URL endpoint");
	return value;
}
function normalizePublicBaseUrl(value) {
	try {
		const url = new URL(value);
		if (url.protocol !== "https:" && url.protocol !== "http:") throw new Error();
		return url.toString().replace(/\/+$/, "");
	} catch {
		throw new Error("R2_PUBLIC_BASE_URL phải là URL http/https hợp lệ");
	}
}
function r2Config() {
	return {
		accountId: normalizeAccountId(requiredEnv("R2_ACCOUNT_ID")),
		accessKeyId: requiredEnv("R2_ACCESS_KEY_ID"),
		secretAccessKey: requiredEnv("R2_SECRET_ACCESS_KEY"),
		bucket: requiredEnv("R2_BUCKET"),
		publicBaseUrl: normalizePublicBaseUrl(requiredEnv("R2_PUBLIC_BASE_URL")),
		maxUploadBytes: parsePositiveInt(process.env.R2_UPLOAD_MAX_BYTES, DEFAULT_MAX_UPLOAD_BYTES),
		expiresIn: Math.min(parsePositiveInt(process.env.R2_PRESIGN_EXPIRES_SECONDS, DEFAULT_EXPIRES_SECONDS), 3600)
	};
}
function r2Client(config) {
	if (!cachedClient) cachedClient = new S3Client({
		region: "auto",
		endpoint: `https://${config.accountId}.r2.cloudflarestorage.com`,
		requestChecksumCalculation: "WHEN_REQUIRED",
		credentials: {
			accessKeyId: config.accessKeyId,
			secretAccessKey: config.secretAccessKey
		}
	});
	return cachedClient;
}
function normalizePurpose(value) {
	const purpose = typeof value === "string" ? value.trim() : "";
	if (!PURPOSE_PREFIX[purpose]) throw new Error(`Loại upload không hợp lệ. Hỗ trợ: ${R2_UPLOAD_PURPOSES.join(", ")}`);
	return purpose;
}
function normalizeContentType(value) {
	const contentType = typeof value === "string" ? value.trim().toLowerCase() : "";
	if (!EXT_BY_TYPE[contentType]) throw new Error("Chỉ chấp nhận ảnh JPEG, PNG, WebP hoặc file PDF");
	return contentType;
}
function createObjectKey(purpose, actorRole, actorId, contentType) {
	const now = /* @__PURE__ */ new Date();
	const year = now.getUTCFullYear();
	const month = String(now.getUTCMonth() + 1).padStart(2, "0");
	const ext = EXT_BY_TYPE[contentType];
	const safeRole = actorRole.toLowerCase().replace(/[^a-z0-9-]/g, "-");
	return [
		"uploads",
		PURPOSE_PREFIX[purpose],
		safeRole,
		actorId,
		String(year),
		month,
		`${crypto.randomUUID()}.${ext}`
	].join("/");
}
async function createR2PresignedUpload(input) {
	const config = r2Config();
	const purpose = normalizePurpose(input.purpose);
	const contentType = normalizeContentType(input.contentType);
	const byteSize = Number(input.byteSize);
	if (!Number.isFinite(byteSize) || byteSize <= 0) throw new Error("Dung lượng file không hợp lệ");
	if (byteSize > config.maxUploadBytes) throw new Error(`Ảnh vượt quá ${Math.round(config.maxUploadBytes / 1024 / 1024)}MB`);
	const objectKey = createObjectKey(purpose, input.actorRole, input.actorId, contentType);
	const command = new PutObjectCommand({
		Bucket: config.bucket,
		Key: objectKey,
		ContentType: contentType
	});
	const uploadUrl = await getSignedUrl(r2Client(config), command, { expiresIn: config.expiresIn });
	new URL(uploadUrl);
	const publicUrl = `${config.publicBaseUrl}/${objectKey}`;
	return {
		uploadUrl,
		method: "PUT",
		headers: { "Content-Type": contentType },
		objectKey,
		publicUrl,
		url: publicUrl,
		expiresIn: config.expiresIn,
		maxSize: config.maxUploadBytes
	};
}
//#endregion
//#region src/routes/api/uploads/presign/+server.ts
function actorFromSession(session) {
	if (!session) return null;
	if (session.role === "TENANT" && session.tenantProfileId) return {
		id: session.tenantProfileId,
		role: session.role
	};
	if (session.role === "LANDLORD" && session.landlordProfileId) return {
		id: session.landlordProfileId,
		role: session.role
	};
	if (session.role === "STAFF" && session.staffProfileId) return {
		id: session.staffProfileId,
		role: session.role
	};
	return {
		id: session.userId,
		role: session.role
	};
}
var POST = async ({ request, locals }) => {
	try {
		const actor = actorFromSession(locals.session);
		if (!actor) return json({ error: "Chưa đăng nhập" }, { status: 401 });
		const body = await request.json();
		return json(await createR2PresignedUpload({
			purpose: body.purpose,
			contentType: body.contentType,
			byteSize: body.byteSize,
			actorId: actor.id,
			actorRole: actor.role
		}));
	} catch (error) {
		const message = errorMessage(error);
		const status = message.includes("Thiếu biến môi trường") || message.includes("R2_") ? 500 : 400;
		return json({ error: message }, { status });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-DfZ3H6AA.js.map
