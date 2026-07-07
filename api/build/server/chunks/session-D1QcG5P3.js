import crypto from 'crypto';

//#region src/lib/server/session.ts
var SECRET = process.env.SESSION_SECRET ?? "roomio-dev-secret-change-in-production";
var SESSION_COOKIE = "roomio_session";
var SESSION_MAX_AGE = 3600 * 24 * 7;
function sign(payload) {
	return crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
}
function createSession(cookies, data) {
	const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
	cookies.set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
		path: "/",
		httpOnly: true,
		sameSite: "lax",
		secure: process.env.NODE_ENV === "production",
		maxAge: SESSION_MAX_AGE
	});
}
function destroySession(cookies) {
	cookies.delete(SESSION_COOKIE, { path: "/" });
}
function readSession(cookies) {
	const raw = cookies.get(SESSION_COOKIE);
	if (!raw) return null;
	const [payload, signature] = raw.split(".");
	if (!payload || !signature) return null;
	const expected = sign(payload);
	const a = Buffer.from(signature);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
	try {
		return JSON.parse(Buffer.from(payload, "base64url").toString());
	} catch {
		return null;
	}
}

export { createSession as c, destroySession as d, readSession as r };
//# sourceMappingURL=session-D1QcG5P3.js.map
