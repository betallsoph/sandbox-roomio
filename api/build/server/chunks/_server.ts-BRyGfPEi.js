import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, l as landlordProfiles, r as rooms, p as properties } from './db-B3IBLKz5.js';
import { r as requireLandlord } from './authz-CdgY0Dc1.js';
import { p as pricingGroupForRentalType, S as SUBSCRIPTION_TIERS, c as calculateSubscriptionQuote } from './subscription-pricing-Cas6nOMH.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, sql } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/subscription/quote/+server.ts
var GET = async ({ locals, url }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlord = await db.query.landlordProfiles.findFirst({
			where: eq(landlordProfiles.id, auth.value),
			columns: {
				subscriptionType: true,
				subscriptionPeriod: true,
				subValidUntil: true,
				enabledRentalTypes: true,
				subscribedStandardRoomLimit: true,
				subscribedColivingRoomLimit: true
			}
		});
		if (!landlord) return json({ error: "Không tìm thấy tài khoản chủ trọ" }, { status: 404 });
		const roomCounts = await db.select({
			rentalType: properties.rentalType,
			count: sql`count(${rooms.id})`
		}).from(properties).leftJoin(rooms, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, auth.value)).groupBy(properties.rentalType);
		const actualStandardRoomCount = roomCounts.filter((row) => pricingGroupForRentalType(row.rentalType) === "STANDARD").reduce((sum, row) => sum + Number(row.count), 0);
		const actualColivingRoomCount = roomCounts.filter((row) => pricingGroupForRentalType(row.rentalType) === "COLIVING").reduce((sum, row) => sum + Number(row.count), 0);
		const requestedCount = (name, actual) => {
			const raw = url.searchParams.get(name);
			if (raw === null || raw.trim() === "") return actual;
			const value = Number(raw);
			return Number.isFinite(value) ? Math.max(actual, Math.floor(value), 0) : actual;
		};
		const standardRoomCount = requestedCount("standardRoomCount", actualStandardRoomCount);
		const colivingRoomCount = requestedCount("colivingRoomCount", actualColivingRoomCount);
		const activeTier = SUBSCRIPTION_TIERS.includes(landlord.subscriptionType) ? landlord.subscriptionType : "FREE";
		const activePeriod = landlord.subscriptionPeriod === "YEARLY" ? "YEARLY" : "MONTHLY";
		const requestedTier = url.searchParams.get("tier");
		const requestedPeriod = url.searchParams.get("period");
		return json({
			...calculateSubscriptionQuote({
				tier: SUBSCRIPTION_TIERS.includes(requestedTier) ? requestedTier : activeTier,
				period: requestedPeriod === "YEARLY" || requestedPeriod === "MONTHLY" ? requestedPeriod : activePeriod,
				standardRoomCount,
				colivingRoomCount
			}),
			activeSubscription: {
				tier: activeTier,
				period: activePeriod,
				validUntil: landlord.subValidUntil,
				enabledRentalTypes: [...new Set(landlord.enabledRentalTypes.split(",").filter(Boolean).map((type) => {
					if (type === "COLIVING") return "APARTMENT";
					if (type === "SERVICED_APARTMENT") return "MOTEL";
					return type;
				}))],
				standardRoomLimit: landlord.subscribedStandardRoomLimit,
				colivingRoomLimit: landlord.subscribedColivingRoomLimit
			},
			actualRoomCounts: {
				standard: actualStandardRoomCount,
				coliving: actualColivingRoomCount
			}
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET };
//# sourceMappingURL=_server.ts-BRyGfPEi.js.map
