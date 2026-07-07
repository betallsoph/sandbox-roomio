//#region src/lib/server/subscription-pricing.ts
var SUBSCRIPTION_TIERS = [
	"FREE",
	"ROOMS_4_10",
	"ROOMS_11_25",
	"ROOMS_26_50",
	"ROOMS_51_80",
	"ROOMS_81_100",
	"ROOMS_101_150",
	"ROOMS_151_PLUS"
];
var SUBSCRIPTION_PERIODS = ["MONTHLY", "YEARLY"];
function pricingGroupForRentalType(rentalType) {
	return rentalType === "APARTMENT" || rentalType === "COLIVING" ? "COLIVING" : "STANDARD";
}
var TIER_LIMITS = {
	FREE: {
		minRooms: 0,
		maxRooms: 3
	},
	ROOMS_4_10: {
		minRooms: 4,
		maxRooms: 10
	},
	ROOMS_11_25: {
		minRooms: 11,
		maxRooms: 25
	},
	ROOMS_26_50: {
		minRooms: 26,
		maxRooms: 50
	},
	ROOMS_51_80: {
		minRooms: 51,
		maxRooms: 80
	},
	ROOMS_81_100: {
		minRooms: 81,
		maxRooms: 100
	},
	ROOMS_101_150: {
		minRooms: 101,
		maxRooms: 150
	},
	ROOMS_151_PLUS: {
		minRooms: 151,
		maxRooms: null
	}
};
function subscriptionTierLimits(tier) {
	return TIER_LIMITS[tier];
}
var MONTHLY_PRICES = {
	STANDARD: {
		FREE: 0,
		ROOMS_4_10: 149e3,
		ROOMS_11_25: 349e3,
		ROOMS_26_50: 699e3,
		ROOMS_51_80: 1119e3,
		ROOMS_81_100: 1399e3,
		ROOMS_101_150: 2099e3,
		ROOMS_151_PLUS: null
	},
	COLIVING: {
		FREE: 0,
		ROOMS_4_10: 129e3,
		ROOMS_11_25: 319e3,
		ROOMS_26_50: 629e3,
		ROOMS_51_80: 959e3,
		ROOMS_81_100: 1199e3,
		ROOMS_101_150: 1799e3,
		ROOMS_151_PLUS: null
	}
};
function subscriptionTierForRoomCount(roomCount) {
	const normalized = normalizeRoomCount(roomCount);
	return SUBSCRIPTION_TIERS.find((tier) => {
		const limits = TIER_LIMITS[tier];
		return normalized >= limits.minRooms && (limits.maxRooms === null || normalized <= limits.maxRooms);
	}) ?? "ROOMS_151_PLUS";
}
function normalizeRoomCount(value) {
	return Math.max(0, Math.floor(Number.isFinite(value) ? value : 0));
}
function monthlyPrice(group, tier) {
	return MONTHLY_PRICES[group][tier];
}
function sumPrices(items) {
	return items.some((item) => item.monthlyPrice === null) ? null : items.reduce((sum, item) => sum + (item.monthlyPrice ?? 0), 0);
}
function calculateSubscriptionQuote(input) {
	const { tier, period } = input;
	const standardRoomCount = normalizeRoomCount(input.standardRoomCount);
	const colivingRoomCount = normalizeRoomCount(input.colivingRoomCount);
	const roomCount = standardRoomCount + colivingRoomCount;
	const recommendedTier = subscriptionTierForRoomCount(roomCount);
	const pooledGroup = standardRoomCount > 0 ? "STANDARD" : colivingRoomCount > 0 ? "COLIVING" : "STANDARD";
	const pooledBreakdown = [{
		group: pooledGroup,
		roomCount,
		tier: recommendedTier,
		monthlyPrice: monthlyPrice(pooledGroup, recommendedTier)
	}];
	const splitBreakdown = [];
	if (standardRoomCount > 0) {
		const standardTier = subscriptionTierForRoomCount(standardRoomCount);
		splitBreakdown.push({
			group: "STANDARD",
			roomCount: standardRoomCount,
			tier: standardTier,
			monthlyPrice: monthlyPrice("STANDARD", standardTier)
		});
	}
	if (colivingRoomCount > 0) {
		const colivingTier = subscriptionTierForRoomCount(colivingRoomCount);
		splitBreakdown.push({
			group: "COLIVING",
			roomCount: colivingRoomCount,
			tier: colivingTier,
			monthlyPrice: monthlyPrice("COLIVING", colivingTier)
		});
	}
	const pooledMonthlyPrice = sumPrices(pooledBreakdown);
	const splitMonthlyPrice = sumPrices(splitBreakdown.length > 0 ? splitBreakdown : pooledBreakdown);
	const canSplit = standardRoomCount >= 4 && colivingRoomCount >= 4;
	const useSplit = canSplit && splitMonthlyPrice !== null && (pooledMonthlyPrice === null || splitMonthlyPrice < pooledMonthlyPrice);
	const strategy = useSplit ? "SPLIT" : "POOLED";
	const breakdown = useSplit ? splitBreakdown : pooledBreakdown;
	const selectedMonthlyPrice = useSplit ? splitMonthlyPrice : pooledMonthlyPrice;
	const limits = TIER_LIMITS[tier];
	return {
		tier,
		recommendedTier,
		period,
		minRooms: limits.minRooms,
		maxRooms: limits.maxRooms,
		strategy,
		splitEligible: canSplit,
		monthlyPrice: selectedMonthlyPrice,
		periodPrice: selectedMonthlyPrice === null ? null : selectedMonthlyPrice * (period === "YEARLY" ? 12 : 1),
		pooledMonthlyPrice,
		splitMonthlyPrice,
		roomCount,
		standardRoomCount,
		colivingRoomCount,
		overCapacity: limits.maxRooms !== null && roomCount > limits.maxRooms,
		requiresContact: selectedMonthlyPrice === null,
		breakdown
	};
}
function subscriptionExpiryDate(period, from = /* @__PURE__ */ new Date()) {
	const expiresAt = new Date(from);
	const originalDay = expiresAt.getDate();
	expiresAt.setDate(1);
	if (period === "YEARLY") expiresAt.setFullYear(expiresAt.getFullYear() + 1);
	else expiresAt.setMonth(expiresAt.getMonth() + 1);
	const lastDayOfTargetMonth = new Date(expiresAt.getFullYear(), expiresAt.getMonth() + 1, 0).getDate();
	expiresAt.setDate(Math.min(originalDay, lastDayOfTargetMonth));
	return expiresAt;
}

export { SUBSCRIPTION_TIERS as S, SUBSCRIPTION_PERIODS as a, subscriptionExpiryDate as b, calculateSubscriptionQuote as c, pricingGroupForRentalType as p, subscriptionTierLimits as s };
//# sourceMappingURL=subscription-pricing-Cas6nOMH.js.map
