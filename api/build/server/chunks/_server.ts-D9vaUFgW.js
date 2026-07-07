import { e as errorMessage } from './api-BHH2biX8.js';
import { g as getPlatformPayOSConfig, v as verifyPayOSWebhook } from './payos-DjyfWihO.js';
import { j as json } from './index-CLnuRv4X.js';
import './db-B3IBLKz5.js';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import 'crypto';
import './index-DBqjc0Yf.js';

//#region src/routes/api/payos-webhook/subscription/+server.ts
var POST = async ({ request }) => {
	try {
		const config = getPlatformPayOSConfig();
		if (!config) return json({ error: "Chưa cấu hình PayOS nền tảng" }, { status: 500 });
		const { data, signature } = await request.json();
		if (!data || typeof data !== "object" || !signature) return json({ error: "Payload PayOS không hợp lệ" }, { status: 400 });
		if (!verifyPayOSWebhook(data, String(signature), config.checksumKey)) return json({ error: "Sai chữ ký PayOS" }, { status: 401 });
		return json({
			success: true,
			message: "Subscription webhook nhận (chưa xử lý)"
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { POST };
//# sourceMappingURL=_server.ts-D9vaUFgW.js.map
