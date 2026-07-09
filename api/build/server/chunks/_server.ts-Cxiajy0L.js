import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, t as tenantProfiles, e as tenantInvites } from './db-DPjKSjsC.js';
import { c as createSession } from './session-D1QcG5P3.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, and, isNull, gt } from 'drizzle-orm';
import crypto from 'crypto';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/lib/server/telegram.ts
var BOT_TOKEN = process.env.BOT_TOKEN?.trim() ?? "";
var INIT_DATA_MAX_AGE_SECONDS = 3600;
var TelegramAuthError = class extends Error {};
function telegramConfigured() {
	return BOT_TOKEN.length > 0;
}
function verifyInitData(initData) {
	if (!BOT_TOKEN) throw new TelegramAuthError("Server chưa cấu hình BOT_TOKEN");
	if (!initData) throw new TelegramAuthError("Thiếu initData");
	const params = new URLSearchParams(initData);
	const hash = params.get("hash");
	if (!hash) throw new TelegramAuthError("initData thiếu hash");
	const pairs = [];
	for (const [key, value] of params.entries()) {
		if (key === "hash") continue;
		pairs.push(`${key}=${value}`);
	}
	pairs.sort();
	const dataCheckString = pairs.join("\n");
	const secretKey = crypto.createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
	const computed = crypto.createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
	const a = Buffer.from(computed);
	const b = Buffer.from(hash);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) throw new TelegramAuthError("Chữ ký initData không hợp lệ");
	const authDate = Number(params.get("auth_date"));
	if (!authDate || Number.isNaN(authDate)) throw new TelegramAuthError("initData thiếu auth_date");
	const ageSeconds = Math.floor(Date.now() / 1e3) - authDate;
	if (ageSeconds > INIT_DATA_MAX_AGE_SECONDS || ageSeconds < -3600) throw new TelegramAuthError("initData đã hết hạn, vui lòng mở lại app");
	const userRaw = params.get("user");
	if (!userRaw) throw new TelegramAuthError("initData thiếu thông tin user");
	let user;
	try {
		user = JSON.parse(userRaw);
	} catch {
		throw new TelegramAuthError("initData user không hợp lệ");
	}
	if (typeof user.id !== "number") throw new TelegramAuthError("initData user.id không hợp lệ");
	return {
		user,
		authDate,
		startParam: params.get("start_param"),
		queryId: params.get("query_id")
	};
}
//#endregion
//#region src/routes/api/auth/telegram/+server.ts
var POST = async ({ request, cookies }) => {
	try {
		if (!telegramConfigured()) return json({ error: "Server chưa cấu hình BOT_TOKEN" }, { status: 503 });
		const body = await request.json().catch(() => null);
		const initData = typeof body?.initData === "string" ? body.initData : "";
		let verified;
		try {
			verified = verifyInitData(initData);
		} catch (e) {
			if (e instanceof TelegramAuthError) return json({ error: e.message }, { status: 401 });
			throw e;
		}
		const tgId = String(verified.user.id);
		const startParam = typeof body?.startParam === "string" && body.startParam || verified.startParam;
		let tenant = await db.query.tenantProfiles.findFirst({
			where: eq(tenantProfiles.telegramUserId, tgId),
			with: { user: true }
		});
		if (!tenant) {
			if (!startParam) return json({
				error: "NEEDS_INVITE",
				message: "Tài khoản Telegram chưa được liên kết. Hãy mở bằng link mời từ chủ trọ."
			}, { status: 403 });
			const invite = await db.query.tenantInvites.findFirst({ where: and(eq(tenantInvites.token, startParam), isNull(tenantInvites.usedAt), gt(tenantInvites.expiresAt, /* @__PURE__ */ new Date())) });
			if (!invite) return json({ error: "Link mời không hợp lệ hoặc đã hết hạn" }, { status: 403 });
			const target = await db.query.tenantProfiles.findFirst({
				where: eq(tenantProfiles.id, invite.tenantId),
				with: { user: true }
			});
			if (!target) return json({ error: "Hồ sơ khách thuê không tồn tại" }, { status: 404 });
			if (target.telegramUserId && target.telegramUserId !== tgId) return json({ error: "Hồ sơ này đã được liên kết với một tài khoản Telegram khác" }, { status: 409 });
			await db.update(tenantProfiles).set({ telegramUserId: tgId }).where(eq(tenantProfiles.id, target.id));
			await db.update(tenantInvites).set({ usedAt: /* @__PURE__ */ new Date() }).where(eq(tenantInvites.id, invite.id));
			tenant = target;
		}
		if (!tenant.user || !tenant.user.isActive) return json({ error: "Tài khoản đã bị tạm khóa" }, { status: 403 });
		createSession(cookies, {
			userId: tenant.user.id,
			role: tenant.user.role,
			landlordProfileId: null,
			enabledRentalTypes: null,
			tenantProfileId: tenant.id,
			staffProfileId: null,
			staffLandlordId: null
		});
		return json({
			id: tenant.user.id,
			name: tenant.user.name,
			role: tenant.user.role,
			tenantProfileId: tenant.id
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-Cxiajy0L.js.map
