import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, p as properties, b as blocks, l as landlordProfiles, r as rooms } from './db-DPjKSjsC.js';
import { r as requireLandlord, l as landlordOwnsProperty, f as forbidden } from './authz-Cca2HujG.js';
import { p as pricingGroupForRentalType } from './subscription-pricing-Cas6nOMH.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, asc, sql, and } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/properties/+server.ts
var RENTAL_TYPES = [
	"APARTMENT",
	"MOTEL",
	"DORM",
	"WHOLE_UNIT"
];
function normalizeRentalType(value) {
	const normalized = typeof value === "string" ? value.trim().toUpperCase() : "APARTMENT";
	if (normalized === "COLIVING") return "APARTMENT";
	if (normalized === "SERVICED_APARTMENT") return "MOTEL";
	return RENTAL_TYPES.includes(normalized) ? normalized : "APARTMENT";
}
async function landlordAllowsRentalType(landlordId, rentalType) {
	return ((await db.query.landlordProfiles.findFirst({
		where: (landlordProfiles, { eq }) => eq(landlordProfiles.id, landlordId),
		columns: { enabledRentalTypes: true }
	}))?.enabledRentalTypes?.split(",").map((type) => {
		const normalized = type.trim();
		if (normalized === "COLIVING") return "APARTMENT";
		if (normalized === "SERVICED_APARTMENT") return "MOTEL";
		return normalized;
	}) ?? ["APARTMENT"]).includes(rentalType);
}
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		return json(await db.query.properties.findMany({
			where: eq(properties.landlordId, landlordId),
			with: {
				blocks: true,
				rooms: { columns: {
					id: true,
					roomNumber: true,
					status: true,
					roomType: true,
					monthlyRent: true
				} }
			},
			orderBy: asc(properties.name)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const body = await request.json();
		const { name, shortName, address, blocks: blockNames } = body;
		const rentalType = normalizeRentalType(body.rentalType);
		if (!landlordId || !name || !shortName || !address) return json({ error: "Missing required property fields" }, { status: 400 });
		if (!await landlordAllowsRentalType(landlordId, rentalType)) return json({ error: "Tài khoản chủ trọ chưa được bật loại hình này" }, { status: 403 });
		if (rentalType === "APARTMENT" && (!Array.isArray(blockNames) || blockNames.map((blockName) => blockName.trim()).filter(Boolean).length === 0)) return json({ error: "Chung cư cần có ít nhất một block" }, { status: 400 });
		const property = await db.transaction(async (tx) => {
			const prop = (await tx.insert(properties).values({
				landlordId,
				name,
				shortName,
				address,
				rentalType
			}).returning())[0];
			if (blockNames && Array.isArray(blockNames)) {
				const values = blockNames.map((blockName) => blockName.trim()).filter((blockName) => blockName).map((blockName) => ({
					propertyId: prop.id,
					name: blockName
				}));
				if (values.length > 0) await tx.insert(blocks).values(values);
			}
			return prop;
		});
		return json(await db.query.properties.findFirst({
			where: eq(properties.id, property.id),
			with: {
				blocks: true,
				rooms: true
			}
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const body = await request.json();
		const { id, name, shortName, address, blocks: blockNames } = body;
		if (!id) return json({ error: "Missing property ID" }, { status: 400 });
		if (!await landlordOwnsProperty(auth.value, id)) return forbidden();
		const requestedRentalType = body.rentalType !== void 0 ? normalizeRentalType(body.rentalType) : null;
		if (requestedRentalType && !await landlordAllowsRentalType(auth.value, requestedRentalType)) return json({ error: "Tài khoản chủ trọ chưa được bật loại hình này" }, { status: 403 });
		const updateResult = await db.transaction(async (tx) => {
			if (requestedRentalType) {
				await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${auth.value}))`);
				const currentProperty = (await tx.select({ rentalType: properties.rentalType }).from(properties).where(eq(properties.id, id)))[0];
				if (currentProperty && currentProperty.rentalType !== requestedRentalType && pricingGroupForRentalType(currentProperty.rentalType) !== pricingGroupForRentalType(requestedRentalType)) {
					const profile = (await tx.select({
						standardLimit: landlordProfiles.subscribedStandardRoomLimit,
						colivingLimit: landlordProfiles.subscribedColivingRoomLimit
					}).from(landlordProfiles).where(eq(landlordProfiles.id, auth.value)))[0];
					const targetIsColiving = pricingGroupForRentalType(requestedRentalType) === "COLIVING";
					const targetLimit = targetIsColiving ? profile?.colivingLimit : profile?.standardLimit;
					if (targetLimit !== null && targetLimit !== void 0) {
						const propertyRoomCount = Number((await tx.select({ count: sql`count(${rooms.id})` }).from(rooms).where(eq(rooms.propertyId, id)))[0]?.count ?? 0);
						if (Number((await tx.select({ count: sql`count(${rooms.id})` }).from(properties).leftJoin(rooms, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, auth.value), targetIsColiving ? sql`${properties.rentalType} in ('APARTMENT', 'COLIVING')` : sql`${properties.rentalType} not in ('APARTMENT', 'COLIVING')`)))[0]?.count ?? 0) + propertyRoomCount > targetLimit) return { error: `Chuyển loại hình sẽ vượt hạn mức ${targetLimit} phòng ${targetIsColiving ? "chung cư / co-living" : "tiêu chuẩn"}` };
					}
				}
			}
			const updateData = {};
			if (name !== void 0) updateData.name = name;
			if (shortName !== void 0) updateData.shortName = shortName;
			if (address !== void 0) updateData.address = address;
			if (requestedRentalType) updateData.rentalType = requestedRentalType;
			if (Object.keys(updateData).length > 0) await tx.update(properties).set(updateData).where(eq(properties.id, id));
			if (blockNames && Array.isArray(blockNames)) {
				const existingNames = (await tx.select().from(blocks).where(eq(blocks.propertyId, id))).map((b) => b.name);
				const newBlocks = blockNames.map((blockName) => blockName.trim()).filter((blockName) => blockName && !existingNames.includes(blockName)).map((blockName) => ({
					propertyId: id,
					name: blockName
				}));
				if (newBlocks.length > 0) await tx.insert(blocks).values(newBlocks);
			}
			return { success: true };
		});
		if ("error" in updateResult) return json({ error: updateResult.error }, { status: 403 });
		return json(await db.query.properties.findFirst({
			where: eq(properties.id, id),
			with: {
				blocks: true,
				rooms: true
			}
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var DELETE = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const id = url.searchParams.get("id");
		if (!id) return json({ error: "Missing property ID" }, { status: 400 });
		if (!await landlordOwnsProperty(auth.value, id)) return forbidden();
		await db.delete(properties).where(eq(properties.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-Ch3C9LDO.js.map
