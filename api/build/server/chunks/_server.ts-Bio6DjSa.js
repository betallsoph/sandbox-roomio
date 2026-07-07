import { e as errorMessage } from './api-BHH2biX8.js';
import { o as paymentTransactions, d as db } from './db-B3IBLKz5.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, desc, and } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/payments/+server.ts
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const status = url.searchParams.get("status");
		const conditions = [eq(paymentTransactions.landlordId, auth.value)];
		if (status) conditions.push(eq(paymentTransactions.status, status));
		return json(await db.query.paymentTransactions.findMany({
			where: and(...conditions),
			with: { invoice: true },
			orderBy: desc(paymentTransactions.receivedAt),
			limit: 200
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET };
//# sourceMappingURL=_server.ts-Bio6DjSa.js.map
