import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, l as landlordProfiles } from './db-DPjKSjsC.js';
import { e as encryptSecret, a as confirmPayOSWebhook } from './payos-B0TvKIoy.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import './index-DBqjc0Yf.js';

//#region src/routes/api/payos-connect/+server.ts
function apiWebhookUrl() {
	return `${(process.env.ORIGIN ?? process.env.PUBLIC_APP_ORIGIN ?? "http://localhost:3000").replace(/\/$/, "")}/api/payos-webhook`;
}
function resolveTargetLandlordId(session, bodyLandlordId) {
	if (session?.role === "LANDLORD" && session.landlordProfileId) return {
		ok: true,
		id: session.landlordProfileId
	};
	if (session?.role === "SUPER_ADMIN") {
		if (!bodyLandlordId) return {
			ok: false,
			response: json({ error: "Thiếu landlordId" }, { status: 400 })
		};
		return {
			ok: true,
			id: bodyLandlordId
		};
	}
	return {
		ok: false,
		response: json({ error: "Không có quyền cấu hình PayOS" }, { status: 403 })
	};
}
var GET = async ({ url, locals }) => {
	try {
		const target = resolveTargetLandlordId(locals.session, url.searchParams.get("landlordId"));
		if (!target.ok) return target.response;
		const profile = await db.query.landlordProfiles.findFirst({
			where: eq(landlordProfiles.id, target.id),
			columns: {
				payosClientId: true,
				payosConnectedAt: true
			}
		});
		return json({
			connected: !!profile?.payosClientId,
			clientId: profile?.payosClientId ?? null,
			connectedAt: profile?.payosConnectedAt ?? null
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const body = await request.json();
		const action = body.action ?? "connect";
		const target = resolveTargetLandlordId(locals.session, body.landlordId);
		if (!target.ok) return target.response;
		if (action === "disconnect") {
			await db.update(landlordProfiles).set({
				payosClientId: null,
				payosApiKeyEnc: null,
				payosChecksumKeyEnc: null,
				payosConnectedAt: null
			}).where(eq(landlordProfiles.id, target.id));
			return json({ connected: false });
		}
		const clientId = String(body.clientId ?? "").trim();
		const apiKey = String(body.apiKey ?? "").trim();
		const checksumKey = String(body.checksumKey ?? "").trim();
		if (!clientId || !apiKey || !checksumKey) return json({ error: "Cần đủ clientId, apiKey và checksumKey" }, { status: 400 });
		await db.update(landlordProfiles).set({
			payosClientId: clientId,
			payosApiKeyEnc: encryptSecret(apiKey),
			payosChecksumKeyEnc: encryptSecret(checksumKey),
			payosConnectedAt: /* @__PURE__ */ new Date()
		}).where(eq(landlordProfiles.id, target.id));
		let webhookRegistered = false;
		let warning = null;
		try {
			await confirmPayOSWebhook({
				clientId,
				apiKey,
				checksumKey
			}, apiWebhookUrl());
			webhookRegistered = true;
		} catch (e) {
			warning = errorMessage(e);
		}
		return json({
			connected: true,
			webhookRegistered,
			webhookUrl: apiWebhookUrl(),
			warning
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST };
//# sourceMappingURL=_server.ts-Cq99oY1k.js.map
