import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, l as landlordProfiles } from './db-B3IBLKz5.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/settings/+server.ts
var GET = async ({ locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const landlordProfile = await db.query.landlordProfiles.findFirst({
			where: eq(landlordProfiles.id, landlordId),
			with: { user: { columns: {
				name: true,
				email: true,
				phone: true
			} } }
		});
		if (!landlordProfile) return json({ error: "Landlord profile not found" }, { status: 404 });
		return json(landlordProfile);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const { companyName, bankName, bankCode, accountNumber, accountName, bankBranch, momoNumber } = await request.json();
		const updateData = {};
		if (companyName !== void 0) updateData.companyName = companyName;
		if (bankName !== void 0) updateData.bankName = bankName;
		if (bankCode !== void 0) updateData.bankCode = bankCode;
		if (accountNumber !== void 0) updateData.accountNumber = accountNumber;
		if (accountName) updateData.accountName = accountName.toUpperCase();
		if (bankBranch !== void 0) updateData.bankBranch = bankBranch;
		if (momoNumber !== void 0) updateData.momoNumber = momoNumber || null;
		if (Object.keys(updateData).length === 0) return json({ error: "No fields to update" }, { status: 400 });
		return json((await db.update(landlordProfiles).set(updateData).where(eq(landlordProfiles.id, landlordId)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, PUT };
//# sourceMappingURL=_server.ts-DGTEqDFV.js.map
