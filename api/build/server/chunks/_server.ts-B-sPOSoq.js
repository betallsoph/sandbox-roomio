import { e as errorMessage } from './api-BHH2biX8.js';
import { r as requireLandlord } from './authz-Cca2HujG.js';
import { g as getCentralInbox } from './automation-CKGTzXZr.js';
import { j as json } from './index-CLnuRv4X.js';
import './db-DPjKSjsC.js';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'drizzle-orm';
import './index-DBqjc0Yf.js';

//#region src/routes/api/inbox/+server.ts
var GET = async ({ locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		return json(await getCentralInbox(auth.value));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET };
//# sourceMappingURL=_server.ts-B-sPOSoq.js.map
