import { d as db, u as users } from './db-DPjKSjsC.js';
import { r as readSession, d as destroySession } from './session-D1QcG5P3.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import './index-DBqjc0Yf.js';

//#region src/lib/server/rate-limit.ts
var buckets = /* @__PURE__ */ new Map();
function rateLimit(key, limit, windowMs) {
	const now = Date.now();
	const bucket = buckets.get(key);
	if (!bucket || bucket.resetAt <= now) {
		buckets.set(key, {
			count: 1,
			resetAt: now + windowMs
		});
		return null;
	}
	if (bucket.count >= limit) {
		const retryAfter = Math.ceil((bucket.resetAt - now) / 1e3);
		return json({ error: "Thao tác quá nhanh, vui lòng thử lại sau ít phút" }, {
			status: 429,
			headers: { "Retry-After": String(retryAfter) }
		});
	}
	bucket.count += 1;
	return null;
}
//#endregion
//#region src/hooks.server.ts
var PUBLIC_API = [
	"/api/auth",
	"/api/payment-webhook",
	"/api/payos-webhook"
];
function isEnvSuperAdminSession(session) {
	return session.role === "SUPER_ADMIN" && (session.userId === "env-super-admin" || session.userId.startsWith("env-super-admin:") || session.userId === "hardcoded-super-admin");
}
var STAFF_ALLOWLIST = [
	{
		prefix: "/api/requests",
		methods: ["GET", "PUT"]
	},
	{
		prefix: "/api/meter-readings",
		methods: ["GET", "PUT"]
	},
	{
		prefix: "/api/rooms",
		methods: ["GET"]
	},
	{
		prefix: "/api/tenants",
		methods: ["GET"]
	},
	{
		prefix: "/api/upload",
		methods: ["POST"]
	},
	{
		prefix: "/api/uploads/presign",
		methods: ["POST"]
	}
];
var handle = async ({ event, resolve }) => {
	const session = readSession(event.cookies);
	event.locals.session = session;
	const { pathname } = event.url;
	if (pathname === "/api/auth" && event.request.method === "POST") {
		const limited = rateLimit(`auth:${event.getClientAddress()}`, 20, 900 * 1e3);
		if (limited) return limited;
	}
	if (pathname === "/api/auth/telegram" && event.request.method === "POST") {
		const limited = rateLimit(`tg-auth:${event.getClientAddress()}`, 30, 900 * 1e3);
		if (limited) return limited;
	}
	if (pathname === "/api/upload" && event.request.method === "POST") {
		const limited = rateLimit(`upload:${event.getClientAddress()}`, 60, 3600 * 1e3);
		if (limited) return limited;
	}
	if (pathname === "/api/uploads/presign" && event.request.method === "POST") {
		const limited = rateLimit(`upload-presign:${event.getClientAddress()}`, 120, 3600 * 1e3);
		if (limited) return limited;
	}
	if (pathname === "/api/payment-webhook" && event.request.method === "POST") {
		const limited = rateLimit(`webhook:${event.getClientAddress()}`, 180, 60 * 1e3);
		if (limited) return limited;
	}
	if (pathname === "/api/payos-webhook" && event.request.method === "POST") {
		const limited = rateLimit(`payos-webhook:${event.getClientAddress()}`, 180, 60 * 1e3);
		if (limited) return limited;
	}
	if (pathname.startsWith("/api") && !PUBLIC_API.some((p) => pathname.startsWith(p))) {
		if (!session) return json({ error: "Chưa đăng nhập" }, { status: 401 });
		if (!isEnvSuperAdminSession(session)) {
			const account = await db.query.users.findFirst({
				where: eq(users.id, session.userId),
				columns: {
					isActive: true,
					role: true
				}
			});
			if (!account || !account.isActive) {
				destroySession(event.cookies);
				return json({ error: "Phiên đã hết hiệu lực, vui lòng đăng nhập lại" }, { status: 401 });
			}
			if (account.role !== session.role) {
				destroySession(event.cookies);
				return json({ error: "Quyền truy cập đã thay đổi, vui lòng đăng nhập lại" }, { status: 401 });
			}
		}
		if (session.role === "LANDLORD") {
			const landlordId = event.url.searchParams.get("landlordId");
			if (landlordId && landlordId !== session.landlordProfileId) return json({ error: "Không có quyền truy cập dữ liệu này" }, { status: 403 });
		}
		if (session.role === "TENANT") {
			const tenantId = event.url.searchParams.get("tenantId");
			if (tenantId && tenantId !== session.tenantProfileId) return json({ error: "Không có quyền truy cập dữ liệu này" }, { status: 403 });
		}
		if (session.role === "STAFF") {
			if (!STAFF_ALLOWLIST.some((rule) => pathname.startsWith(rule.prefix) && rule.methods.includes(event.request.method))) return json({ error: "Nhân viên không có quyền thực hiện thao tác này" }, { status: 403 });
			const landlordId = event.url.searchParams.get("landlordId");
			if (landlordId && landlordId !== session.staffLandlordId) return json({ error: "Không có quyền truy cập dữ liệu này" }, { status: 403 });
			const staffId = event.url.searchParams.get("staffId");
			if (staffId && staffId !== session.staffProfileId) return json({ error: "Không có quyền truy cập dữ liệu này" }, { status: 403 });
		}
		if (pathname.startsWith("/api/super-admin") && session.role !== "SUPER_ADMIN") return json({ error: "Chỉ Super Admin được phép truy cập" }, { status: 403 });
	}
	return resolve(event);
};

export { handle };
//# sourceMappingURL=hooks.server-ci2E_6Fr.js.map
