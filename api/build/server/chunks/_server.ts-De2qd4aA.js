import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, r as rooms, p as properties, m as meterReadings, l as landlordProfiles, c as services, w as roomServiceConfigs, x as roomAssets } from './db-DPjKSjsC.js';
import { r as requireLandlord, a as landlordOwnsRoom, f as forbidden, l as landlordOwnsProperty } from './authz-Cca2HujG.js';
import { S as SUBSCRIPTION_TIERS, p as pricingGroupForRentalType, s as subscriptionTierLimits } from './subscription-pricing-Cas6nOMH.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, inArray, asc, desc, and, sql } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/lib/server/room-code.ts
function normalizeRoomTextKey(value) {
	return String(value ?? "").trim().toLowerCase().replace(/\s+/g, " ");
}
//#endregion
//#region src/routes/api/rooms/+server.ts
function roomUnitKey(roomNumber, roomCode, blockId, floor) {
	return [
		blockId || "",
		floor ?? "",
		normalizeRoomTextKey(roomCode || roomNumber)
	].join("|");
}
function normalizeApartmentUnit(value) {
	const raw = String(value ?? "").trim().toUpperCase().replace(/\s+/g, "");
	if (!raw) return "";
	return raw;
}
function normalizeFloor(value) {
	const floorNumber = Number(value);
	if (!Number.isFinite(floorNumber)) return null;
	return Math.trunc(floorNumber);
}
async function findDuplicateRoom(propertyId, roomNumber, roomCode, blockId, floor, excludeRoomId) {
	const targetUnit = roomUnitKey(roomNumber, roomCode, blockId, floor);
	const targetName = normalizeRoomTextKey(roomNumber);
	if (!targetUnit && !targetName) return void 0;
	return (await db.query.rooms.findMany({
		where: eq(rooms.propertyId, propertyId),
		columns: {
			id: true,
			roomNumber: true,
			roomCode: true,
			blockId: true,
			floor: true
		}
	})).find((room) => {
		if (excludeRoomId && room.id === excludeRoomId) return false;
		const existingUnit = roomUnitKey(room.roomNumber, room.roomCode, room.blockId, room.floor);
		const existingName = normalizeRoomTextKey(room.roomNumber);
		return existingUnit === targetUnit && existingName === targetName;
	});
}
var GET = async ({ url, locals }) => {
	try {
		const propertyId = url.searchParams.get("propertyId");
		const blockId = url.searchParams.get("blockId");
		const tenantId = url.searchParams.get("tenantId");
		const status = url.searchParams.get("status");
		const landlordId = url.searchParams.get("landlordId");
		const conditions = [];
		if (locals.session?.role === "LANDLORD") conditions.push(inArray(rooms.propertyId, db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, locals.session.landlordProfileId))));
		if (locals.session?.role === "TENANT") {
			if (!locals.session.tenantProfileId) return forbidden();
			conditions.push(eq(rooms.tenantId, locals.session.tenantProfileId));
		}
		if (locals.session?.role === "STAFF") conditions.push(inArray(rooms.propertyId, db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, locals.session.staffLandlordId))));
		if (status) conditions.push(eq(rooms.status, status));
		if (propertyId) conditions.push(eq(rooms.propertyId, propertyId));
		if (blockId && blockId !== "all") conditions.push(eq(rooms.blockId, blockId));
		if (tenantId) conditions.push(eq(rooms.tenantId, tenantId));
		if (landlordId) conditions.push(inArray(rooms.propertyId, db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, landlordId))));
		return json(await db.query.rooms.findMany({
			where: conditions.length > 0 ? and(...conditions) : void 0,
			with: {
				block: true,
				property: true,
				tenant: { with: { user: true } },
				services: { with: { service: true } },
				assets: true,
				meterReadings: { orderBy: desc(meterReadings.month) }
			},
			orderBy: asc(rooms.roomNumber)
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { propertyId, blockId, roomNumber, roomCode, unitNumber, roomType, floor, monthlyRent, area } = await request.json();
		if (!propertyId || !roomNumber || !roomType || !monthlyRent) return json({ error: "Missing required room fields" }, { status: 400 });
		if (!await landlordOwnsProperty(auth.value, propertyId)) return forbidden();
		const property = await db.query.properties.findFirst({
			where: eq(properties.id, propertyId),
			with: { blocks: true }
		});
		if (!property) return json({ error: "Property not found" }, { status: 404 });
		const nextRoomNumber = String(roomNumber).trim();
		let nextRoomCode = roomCode ? String(roomCode).trim() : null;
		let nextBlockId = blockId || null;
		const nextFloor = floor !== void 0 && floor !== null && floor !== "" ? normalizeFloor(floor) : null;
		if (property.rentalType === "APARTMENT") {
			if (!nextBlockId || nextFloor === null) return json({ error: "Chung cư cần chọn block và nhập tầng" }, { status: 400 });
			if (!property.blocks.find((item) => item.id === nextBlockId)) return json({ error: "Block không thuộc tòa nhà đã chọn" }, { status: 400 });
			const apartmentUnit = normalizeApartmentUnit(unitNumber || roomCode);
			if (!apartmentUnit) return json({ error: "Chung cư cần nhập số căn" }, { status: 400 });
			nextRoomCode = apartmentUnit;
		} else if (nextBlockId) {
			if (!property.blocks.find((item) => item.id === nextBlockId)) return json({ error: "Khu/dãy không thuộc tòa nhà đã chọn" }, { status: 400 });
		}
		const existing = await findDuplicateRoom(propertyId, nextRoomNumber, nextRoomCode, nextBlockId, nextFloor);
		if (existing) return json({ error: `Phòng "${nextRoomNumber}" đã tồn tại trong căn ${nextRoomCode || existing.roomCode || existing.roomNumber}` }, { status: 400 });
		const createResult = await db.transaction(async (tx) => {
			await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${auth.value}))`);
			const profile = (await tx.select({
				subscriptionType: landlordProfiles.subscriptionType,
				subValidUntil: landlordProfiles.subValidUntil,
				standardLimit: landlordProfiles.subscribedStandardRoomLimit,
				colivingLimit: landlordProfiles.subscribedColivingRoomLimit
			}).from(landlordProfiles).where(eq(landlordProfiles.id, auth.value)))[0];
			const tier = SUBSCRIPTION_TIERS.includes(profile?.subscriptionType) ? profile.subscriptionType : "FREE";
			if (tier !== "FREE" && profile?.subValidUntil && profile.subValidUntil <= /* @__PURE__ */ new Date()) return { error: "Gói Roomio đã hết hạn; vui lòng gia hạn trước khi thêm phòng" };
			const roomCounts = await tx.select({
				rentalType: properties.rentalType,
				count: sql`count(${rooms.id})`
			}).from(properties).leftJoin(rooms, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, auth.value)).groupBy(properties.rentalType);
			const standardCount = roomCounts.filter((row) => pricingGroupForRentalType(row.rentalType) === "STANDARD").reduce((sum, row) => sum + Number(row.count), 0);
			const colivingCount = roomCounts.filter((row) => pricingGroupForRentalType(row.rentalType) === "COLIVING").reduce((sum, row) => sum + Number(row.count), 0);
			const totalCount = standardCount + colivingCount;
			const limits = subscriptionTierLimits(tier);
			if (limits.maxRooms !== null && totalCount >= limits.maxRooms) return { error: `Gói hiện tại chỉ cho phép tối đa ${limits.maxRooms} phòng` };
			const isColivingGroup = pricingGroupForRentalType(property.rentalType) === "COLIVING";
			const groupCount = isColivingGroup ? colivingCount : standardCount;
			const groupLimit = isColivingGroup ? profile?.colivingLimit : profile?.standardLimit;
			if (groupLimit !== null && groupLimit !== void 0 && groupCount >= groupLimit) return { error: `Đã đạt hạn mức ${groupLimit} đơn vị ${isColivingGroup ? "share phòng chung cư / co-living" : "trọ / CHDV / Sleepbox / nguyên căn"} đã đăng ký` };
			const r = (await tx.insert(rooms).values({
				propertyId,
				blockId: nextBlockId,
				roomNumber: nextRoomNumber,
				roomCode: nextRoomCode,
				roomType,
				floor: nextFloor,
				status: "empty",
				monthlyRent: Number(monthlyRent),
				area: area ? Number(area) : null,
				debtAmount: 0
			}).returning())[0];
			const propertyOwner = (await tx.select({ landlordId: properties.landlordId }).from(properties).where(eq(properties.id, propertyId)))[0];
			if (propertyOwner) {
				const activeServices = await tx.select().from(services).where(and(eq(services.landlordId, propertyOwner.landlordId), eq(services.isActive, true)));
				if (activeServices.length > 0) await tx.insert(roomServiceConfigs).values(activeServices.map((service) => ({
					roomId: r.id,
					serviceId: service.id,
					customRate: null,
					quantity: 1
				})));
			}
			return { room: r };
		});
		if ("error" in createResult) return json({ error: createResult.error }, { status: 403 });
		const room = createResult.room;
		return json(await db.query.rooms.findFirst({
			where: eq(rooms.id, room.id),
			with: {
				tenant: { with: { user: true } },
				services: { with: { service: true } },
				assets: true,
				meterReadings: true
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
		const { id, action, ...data } = await request.json();
		if (!id) return json({ error: "Missing room ID" }, { status: 400 });
		if (!await landlordOwnsRoom(auth.value, id)) return forbidden();
		if (action === "updateMeters") {
			const { serviceId, month, prevValue, currValue, photoUrl } = data;
			if (!serviceId || !month || currValue === void 0 || prevValue === void 0) return json({ error: "Missing meter reading parameters" }, { status: 400 });
			const existingReading = await db.query.meterReadings.findFirst({ where: and(eq(meterReadings.roomId, id), eq(meterReadings.serviceId, serviceId), eq(meterReadings.month, month)) });
			if (existingReading) {
				const updateData = {
					prevValue: Number(prevValue),
					currValue: Number(currValue),
					recordedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
				};
				if (photoUrl) updateData.photoUrl = photoUrl;
				await db.update(meterReadings).set(updateData).where(eq(meterReadings.id, existingReading.id));
			} else await db.insert(meterReadings).values({
				roomId: id,
				serviceId,
				month,
				prevValue: Number(prevValue),
				currValue: Number(currValue),
				photoUrl: photoUrl || null,
				recordedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0]
			});
		} else if (action === "updateAsset") {
			const { assetId, name, code, status, notes } = data;
			if (!name) return json({ error: "Missing asset name" }, { status: 400 });
			if (assetId) await db.update(roomAssets).set({
				name,
				code,
				status,
				notes
			}).where(eq(roomAssets.id, assetId));
			else await db.insert(roomAssets).values({
				roomId: id,
				name,
				code,
				status,
				notes
			});
		} else if (action === "deleteAsset") {
			const { assetId } = data;
			if (assetId) await db.delete(roomAssets).where(eq(roomAssets.id, assetId));
		} else if (action === "updateServiceConfig") {
			const { configs } = data;
			if (configs && Array.isArray(configs)) for (const config of configs) await db.update(roomServiceConfigs).set({
				customRate: config.customRate === "" || config.customRate === null ? null : Number(config.customRate),
				quantity: Number(config.quantity) || 1
			}).where(and(eq(roomServiceConfigs.roomId, id), eq(roomServiceConfigs.serviceId, config.serviceId)));
		} else if (action === "checkout") await db.update(rooms).set({
			status: "empty",
			tenantId: null,
			debtAmount: 0
		}).where(eq(rooms.id, id));
		else {
			const updateData = {};
			if (data.roomNumber !== void 0 || data.roomCode !== void 0 || data.unitNumber !== void 0 || data.blockId !== void 0 || data.floor !== void 0) {
				const currentRoom = await db.query.rooms.findFirst({
					where: eq(rooms.id, id),
					columns: {
						propertyId: true,
						roomNumber: true,
						roomCode: true,
						blockId: true,
						floor: true
					}
				});
				if (!currentRoom) return json({ error: "Room not found" }, { status: 404 });
				const property = await db.query.properties.findFirst({
					where: eq(properties.id, currentRoom.propertyId),
					with: { blocks: true }
				});
				if (!property) return json({ error: "Property not found" }, { status: 404 });
				const submittedRoomNumber = data.roomNumber !== void 0 ? String(data.roomNumber).trim() : currentRoom.roomNumber;
				let submittedRoomCode = data.roomCode !== void 0 ? data.roomCode ? String(data.roomCode).trim() : null : currentRoom.roomCode;
				const submittedBlockId = data.blockId !== void 0 ? data.blockId || null : currentRoom.blockId;
				const submittedFloor = data.floor !== void 0 && data.floor !== null && data.floor !== "" ? normalizeFloor(data.floor) : currentRoom.floor;
				if (property.rentalType === "APARTMENT") {
					if (!submittedBlockId || submittedFloor === null) return json({ error: "Chung cư cần chọn block và nhập tầng" }, { status: 400 });
					if (!property.blocks.find((item) => item.id === submittedBlockId)) return json({ error: "Block không thuộc tòa nhà đã chọn" }, { status: 400 });
					const apartmentUnit = normalizeApartmentUnit(data.unitNumber || submittedRoomCode);
					if (!apartmentUnit) return json({ error: "Chung cư cần nhập số căn" }, { status: 400 });
					submittedRoomCode = apartmentUnit;
				} else if (submittedBlockId) {
					if (!property.blocks.find((item) => item.id === submittedBlockId)) return json({ error: "Khu/dãy không thuộc tòa nhà đã chọn" }, { status: 400 });
				}
				const nextRoomNumber = submittedRoomNumber;
				const nextRoomCode = submittedRoomCode;
				const duplicate = await findDuplicateRoom(currentRoom.propertyId, nextRoomNumber, nextRoomCode, submittedBlockId, submittedFloor, id);
				if (duplicate) return json({ error: `Phòng "${nextRoomNumber}" đã tồn tại trong căn ${nextRoomCode || duplicate.roomCode || duplicate.roomNumber}` }, { status: 400 });
				if (data.roomNumber !== void 0) updateData.roomNumber = nextRoomNumber;
				if (data.roomCode !== void 0 || data.unitNumber !== void 0 || property.rentalType === "APARTMENT" && (data.blockId !== void 0 || data.floor !== void 0)) updateData.roomCode = nextRoomCode;
			}
			if (data.roomType !== void 0) updateData.roomType = data.roomType;
			if (data.floor !== void 0) updateData.floor = normalizeFloor(data.floor);
			if (data.monthlyRent !== void 0) updateData.monthlyRent = Number(data.monthlyRent);
			if (data.area !== void 0) updateData.area = Number(data.area);
			if (data.status !== void 0) updateData.status = data.status;
			if (data.debtAmount !== void 0) updateData.debtAmount = Number(data.debtAmount);
			if (data.blockId !== void 0) updateData.blockId = data.blockId || null;
			if (Object.keys(updateData).length > 0) await db.update(rooms).set(updateData).where(eq(rooms.id, id));
		}
		return json(await db.query.rooms.findFirst({
			where: eq(rooms.id, id),
			with: {
				tenant: { with: { user: true } },
				services: { with: { service: true } },
				assets: true,
				meterReadings: { orderBy: desc(meterReadings.month) }
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
		if (!id) return json({ error: "Missing room ID" }, { status: 400 });
		if (!await landlordOwnsRoom(auth.value, id)) return forbidden();
		await db.delete(rooms).where(eq(rooms.id, id));
		return json({ success: true });
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { DELETE, GET, POST, PUT };
//# sourceMappingURL=_server.ts-De2qd4aA.js.map
