import { e as errorMessage } from './api-BHH2biX8.js';
import { m as meterReadings, d as db, r as rooms, p as properties, h as services } from './db-B3IBLKz5.js';
import { a as landlordOwnsRoom, f as forbidden } from './authz-CdgY0Dc1.js';
import { j as json } from './index-CLnuRv4X.js';
import { inArray, eq, and, desc } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/meter-readings/+server.ts
var ANOMALY_THRESHOLD = .5;
async function actorOwnsReading(session, readingId) {
	const reading = await db.query.meterReadings.findFirst({ where: eq(meterReadings.id, readingId) });
	if (!reading) return false;
	if (session?.role === "LANDLORD") return landlordOwnsRoom(session.landlordProfileId, reading.roomId);
	if (session?.role === "STAFF") return (await db.select({ id: meterReadings.id }).from(meterReadings).innerJoin(rooms, eq(meterReadings.roomId, rooms.id)).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(meterReadings.id, readingId), eq(properties.landlordId, session.staffLandlordId))).limit(1)).length > 0;
	return false;
}
var GET = async ({ url }) => {
	try {
		const landlordId = url.searchParams.get("landlordId");
		const tenantId = url.searchParams.get("tenantId");
		const status = url.searchParams.get("status");
		const conditions = [];
		if (landlordId) conditions.push(inArray(meterReadings.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId))));
		else if (tenantId) conditions.push(inArray(meterReadings.roomId, db.select({ id: rooms.id }).from(rooms).where(eq(rooms.tenantId, tenantId))));
		else return json({ error: "Missing landlordId or tenantId" }, { status: 400 });
		if (status) conditions.push(eq(meterReadings.status, status));
		return json(await db.select({
			id: meterReadings.id,
			roomId: meterReadings.roomId,
			serviceId: meterReadings.serviceId,
			month: meterReadings.month,
			prevValue: meterReadings.prevValue,
			submittedValue: meterReadings.submittedValue,
			currValue: meterReadings.currValue,
			recordedAt: meterReadings.recordedAt,
			photoUrl: meterReadings.photoUrl,
			status: meterReadings.status,
			submittedBy: meterReadings.submittedBy,
			isAnomalous: meterReadings.isAnomalous,
			roomNumber: rooms.roomNumber,
			propertyName: properties.shortName,
			serviceName: services.name
		}).from(meterReadings).innerJoin(rooms, eq(meterReadings.roomId, rooms.id)).innerJoin(properties, eq(rooms.propertyId, properties.id)).leftJoin(services, eq(meterReadings.serviceId, services.id)).where(and(...conditions)).orderBy(desc(meterReadings.month), desc(meterReadings.recordedAt)));
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var POST = async ({ request, locals }) => {
	try {
		const { roomId, serviceId, month, currValue, photoUrl } = await request.json();
		if (!roomId || !serviceId || !month || currValue === void 0 || currValue === "") return json({ error: "Thiếu thông tin chỉ số" }, { status: 400 });
		if (locals.session?.role === "TENANT" && (typeof photoUrl !== "string" || !photoUrl.trim())) return json({ error: "Khách thuê cần chụp ảnh đồng hồ trước khi gửi" }, { status: 400 });
		const room = await db.query.rooms.findFirst({ where: eq(rooms.id, roomId) });
		if (!room) return json({ error: "Không tìm thấy phòng" }, { status: 404 });
		if (locals.session?.role === "TENANT" && room.tenantId !== locals.session.tenantProfileId) return json({ error: "Bạn không thuê phòng này" }, { status: 403 });
		if (locals.session?.role === "LANDLORD" && !await landlordOwnsRoom(locals.session.landlordProfileId, roomId)) return forbidden();
		const history = await db.select().from(meterReadings).where(and(eq(meterReadings.roomId, roomId), eq(meterReadings.serviceId, serviceId), eq(meterReadings.status, "approved"))).orderBy(desc(meterReadings.month)).limit(4);
		const latest = history[0];
		const prevValue = latest ? latest.currValue : 0;
		const curr = Number(currValue);
		if (!Number.isFinite(curr)) return json({ error: "Chỉ số mới không hợp lệ" }, { status: 400 });
		if (curr < prevValue) return json({ error: `Chỉ số mới (${curr}) không được nhỏ hơn chỉ số cũ (${prevValue})` }, { status: 400 });
		const usage = curr - prevValue;
		const pastUsages = history.slice(0, 3).map((r) => r.currValue - r.prevValue).filter((u) => u > 0);
		const avgUsage = pastUsages.length > 0 ? pastUsages.reduce((a, b) => a + b, 0) / pastUsages.length : 0;
		const isAnomalous = avgUsage > 0 && Math.abs(usage - avgUsage) / avgUsage > ANOMALY_THRESHOLD;
		const existing = await db.query.meterReadings.findFirst({ where: and(eq(meterReadings.roomId, roomId), eq(meterReadings.serviceId, serviceId), eq(meterReadings.month, month)) });
		if (existing?.status === "approved") return json({ error: "Chỉ số tháng này đã được chủ nhà chốt, không thể gửi lại" }, { status: 409 });
		const values = {
			roomId,
			serviceId,
			month,
			prevValue,
			submittedValue: curr,
			currValue: curr,
			recordedAt: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
			photoUrl: photoUrl || null,
			status: "pending",
			submittedBy: locals.session?.role === "TENANT" ? "TENANT" : "LANDLORD",
			isAnomalous
		};
		return json(existing ? (await db.update(meterReadings).set(values).where(eq(meterReadings.id, existing.id)).returning())[0] : (await db.insert(meterReadings).values(values).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var PUT = async ({ request, locals }) => {
	try {
		if (locals.session?.role === "TENANT") return json({ error: "Chỉ chủ nhà được chốt số" }, { status: 403 });
		const { id, action, currValue } = await request.json();
		if (!id || !["approve", "reject"].includes(action)) return json({ error: "Thiếu ID hoặc hành động không hợp lệ" }, { status: 400 });
		const reading = await db.query.meterReadings.findFirst({ where: eq(meterReadings.id, id) });
		if (!reading) return json({ error: "Không tìm thấy bản ghi chỉ số" }, { status: 404 });
		if (!await actorOwnsReading(locals.session, id)) return forbidden();
		if (reading.status !== "pending") return json({ error: "Bản ghi này đã được xử lý" }, { status: 409 });
		const updateData = { status: action === "approve" ? "approved" : "rejected" };
		if (action === "approve") {
			if (reading.submittedBy === "TENANT" && !reading.photoUrl) return json({ error: "Không thể duyệt chỉ số khách gửi khi chưa có ảnh đồng hồ" }, { status: 400 });
			const approvedValue = currValue === void 0 ? reading.currValue : Number(currValue);
			if (!Number.isFinite(approvedValue)) return json({ error: "Chỉ số duyệt không hợp lệ" }, { status: 400 });
			if (approvedValue < reading.prevValue) return json({ error: `Chỉ số duyệt (${approvedValue}) không được nhỏ hơn chỉ số cũ (${reading.prevValue})` }, { status: 400 });
			const usages = (await db.select().from(meterReadings).where(and(eq(meterReadings.roomId, reading.roomId), eq(meterReadings.serviceId, reading.serviceId), eq(meterReadings.status, "approved"))).orderBy(desc(meterReadings.month)).limit(3)).map((item) => item.currValue - item.prevValue).filter((usage) => usage > 0);
			const average = usages.length ? usages.reduce((total, usage) => total + usage, 0) / usages.length : 0;
			const usage = approvedValue - reading.prevValue;
			updateData.currValue = approvedValue;
			updateData.isAnomalous = average > 0 && Math.abs(usage - average) / average > ANOMALY_THRESHOLD;
		}
		return json((await db.update(meterReadings).set(updateData).where(eq(meterReadings.id, id)).returning())[0]);
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST, PUT };
//# sourceMappingURL=_server.ts-BzmaTADi.js.map
