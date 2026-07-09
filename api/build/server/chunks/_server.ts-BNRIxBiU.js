import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, e as tenantInvites } from './db-DPjKSjsC.js';
import { r as requireLandlord, b as landlordOwnsTenant, f as forbidden } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import crypto from 'crypto';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import './index-DBqjc0Yf.js';

//#region src/routes/api/tenant-invites/+server.ts
var INVITE_TTL_MS = 10080 * 60 * 1e3;
function buildDeepLink(token) {
	const bot = process.env.BOT_USERNAME?.trim();
	const app = process.env.MINIAPP_SHORT_NAME?.trim();
	if (!bot || !app) return null;
	return `https://t.me/${bot}/${app}?startapp=${token}`;
}
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json().catch(() => null);
		const tenantId = typeof body?.tenantId === "string" ? body.tenantId : "";
		if (!tenantId) return json({ error: "Thiếu tenantId" }, { status: 400 });
		if (!await landlordOwnsTenant(auth.value, tenantId)) return forbidden();
		const token = crypto.randomBytes(24).toString("base64url");
		const expiresAt = new Date(Date.now() + INVITE_TTL_MS);
		await db.insert(tenantInvites).values({
			landlordId: auth.value,
			tenantId,
			token,
			expiresAt
		});
		return json({
			token,
			link: buildDeepLink(token),
			expiresAt: expiresAt.toISOString()
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-BNRIxBiU.js.map
