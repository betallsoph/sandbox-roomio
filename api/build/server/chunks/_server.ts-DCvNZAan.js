import { e as errorMessage } from './api-BHH2biX8.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { l as listTelegramDeliveries, r as retryPendingTelegramDeliveries, a as retryTelegramDelivery } from './message-delivery-Cu1-OKi7.js';
import { j as json } from './index-CLnuRv4X.js';
import './db-B3IBLKz5.js';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import './index-DBqjc0Yf.js';

//#region src/routes/api/telegram-deliveries/+server.ts
var GET = async ({ locals, url }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const limit = Number(url.searchParams.get("limit") ?? 20);
		return json(await listTelegramDeliveries(auth.value, limit));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json().catch(() => null);
		if ((typeof body?.action === "string" ? body.action : "retry") === "retry_all") return json({
			success: true,
			results: await retryPendingTelegramDeliveries(auth.value, Number(body?.limit ?? 10))
		});
		const id = typeof body?.id === "string" ? body.id : "";
		if (!id) return json({ error: "Thiếu notification id" }, { status: 400 });
		const result = await retryTelegramDelivery(auth.value, id);
		if (!result) return json({ error: "Không tìm thấy delivery Telegram" }, { status: 404 });
		return json({
			success: result.delivered,
			result
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST };
//# sourceMappingURL=_server.ts-DCvNZAan.js.map
