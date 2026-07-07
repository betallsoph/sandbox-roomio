import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, r as rooms, p as properties, t as tenantProfiles, u as users, h as services, m as meterReadings, f as contracts } from './db-B3IBLKz5.js';
import { f as forbidden, r as requireLandlord, a as landlordOwnsRoom, b as landlordOwnsTenant } from './authz-CdgY0Dc1.js';
import { h as hashPassword } from './password-D2VnzE1c.js';
import { j as json } from './index-CLnuRv4X.js';
import { eq, and, isNotNull, inArray, or, like } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import 'crypto';
import 'bcryptjs';
import './index-DBqjc0Yf.js';

//#region src/routes/api/tenants/+server.ts
var GET = async ({ locals }) => {
	try {
		const landlordId = locals.session?.role === "STAFF" ? locals.session.staffLandlordId : locals.session?.landlordProfileId;
		if (!landlordId || locals.session?.role !== "LANDLORD" && locals.session?.role !== "STAFF") return forbidden();
		const tenantIdsSubquery = db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, landlordId), isNotNull(rooms.tenantId)));
		const tenants = await db.query.tenantProfiles.findMany({
			where: inArray(tenantProfiles.id, tenantIdsSubquery),
			with: {
				user: { columns: {
					id: true,
					name: true,
					email: true,
					phone: true
				} },
				rooms: { with: {
					property: true,
					block: true
				} }
			}
		});
		tenants.sort((a, b) => a.user.name.localeCompare(b.user.name, "vi"));
		return json(tenants);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const { email, phone, password, name, roomId, idNumber, moveInDate, deposit, notes, initialElectricity, initialWater } = await request.json();
		if (!email || !phone || !password || !name || !roomId || !idNumber || !moveInDate || deposit === void 0) return json({ error: "Thiếu thông tin khách thuê bắt buộc" }, { status: 400 });
		if (!await landlordOwnsRoom(auth.value, roomId)) return forbidden();
		const existingUser = await db.query.users.findFirst({ where: or(eq(users.email, email), eq(users.phone, phone)) });
		const newUserHash = existingUser ? null : await hashPassword(password);
		const tenant = await db.transaction(async (tx) => {
			const user = existingUser ?? (await tx.insert(users).values({
				email,
				phone,
				passwordHash: newUserHash,
				name,
				role: "TENANT"
			}).returning())[0];
			let tenantProfile = (await tx.select().from(tenantProfiles).where(eq(tenantProfiles.userId, user.id)))[0];
			if (!tenantProfile) tenantProfile = (await tx.insert(tenantProfiles).values({
				userId: user.id,
				idNumber,
				moveInDate,
				deposit: Number(deposit),
				notes
			}).returning())[0];
			else tenantProfile = (await tx.update(tenantProfiles).set({
				idNumber,
				moveInDate,
				deposit: Number(deposit),
				notes
			}).where(eq(tenantProfiles.id, tenantProfile.id)).returning())[0];
			const room = (await tx.update(rooms).set({
				tenantId: tenantProfile.id,
				status: "paid",
				debtAmount: 0
			}).where(eq(rooms.id, roomId)).returning())[0];
			const property = (await tx.select({ landlordId: properties.landlordId }).from(properties).where(eq(properties.id, room.propertyId)))[0];
			const checkInMonth = moveInDate.slice(0, 7);
			const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
			if (property) {
				const electricityService = (await tx.select().from(services).where(and(eq(services.landlordId, property.landlordId), like(services.name, "%Điện%"))))[0];
				const waterService = (await tx.select().from(services).where(and(eq(services.landlordId, property.landlordId), like(services.name, "%Nước%"))))[0];
				if (electricityService && initialElectricity !== void 0) await tx.insert(meterReadings).values({
					roomId: room.id,
					serviceId: electricityService.id,
					month: checkInMonth,
					prevValue: Number(initialElectricity),
					currValue: Number(initialElectricity),
					recordedAt: today
				});
				if (waterService && initialWater !== void 0) await tx.insert(meterReadings).values({
					roomId: room.id,
					serviceId: waterService.id,
					month: checkInMonth,
					prevValue: Number(initialWater),
					currValue: Number(initialWater),
					recordedAt: today
				});
			}
			const start = new Date(moveInDate);
			const end = new Date(start.getFullYear() + 1, start.getMonth(), start.getDate());
			await tx.insert(contracts).values({
				tenantId: tenantProfile.id,
				roomId: room.id,
				startDate: moveInDate,
				endDate: end.toISOString().split("T")[0],
				monthlyRent: room.monthlyRent,
				deposit: Number(deposit),
				notes: notes || null,
				status: "active"
			});
			return tenantProfile;
		});
		return json(await db.query.tenantProfiles.findFirst({
			where: eq(tenantProfiles.id, tenant.id),
			with: {
				user: true,
				rooms: { with: { property: true } }
			}
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		const { id, idNumber, idFrontImage, idBackImage, vehicleImage, checkInImage } = await request.json();
		if (!id) return json({ error: "Missing tenant profile ID" }, { status: 400 });
		if (locals.session?.role === "TENANT" && id !== locals.session.tenantProfileId) return json({ error: "Không có quyền cập nhật hồ sơ này" }, { status: 403 });
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsTenant(locals.session.landlordProfileId, id)) return forbidden();
		const updateData = {};
		if (idNumber !== void 0) updateData.idNumber = idNumber;
		if (idFrontImage !== void 0) updateData.idFrontImage = idFrontImage;
		if (idBackImage !== void 0) updateData.idBackImage = idBackImage;
		if (vehicleImage !== void 0) updateData.vehicleImage = vehicleImage;
		if (checkInImage !== void 0) updateData.checkInImage = checkInImage;
		if (Object.keys(updateData).length > 0) await db.update(tenantProfiles).set(updateData).where(eq(tenantProfiles.id, id));
		return json(await db.query.tenantProfiles.findFirst({
			where: eq(tenantProfiles.id, id),
			with: {
				user: true,
				rooms: { with: { property: true } }
			}
		}));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST, PUT };
//# sourceMappingURL=_server.ts-tdKtXOit.js.map
