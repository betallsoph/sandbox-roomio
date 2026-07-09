import { e as errorMessage } from './api-BHH2biX8.js';
import { d as db, r as rooms, m as meterReadings, i as invoices, k as invoiceItems } from './db-DPjKSjsC.js';
import { r as requireLandlord, l as landlordOwnsProperty, f as forbidden } from './authz-Cca2HujG.js';
import { j as json } from './index-CLnuRv4X.js';
import { and, eq, isNotNull, inArray, desc, sql } from 'drizzle-orm';
import './chunk-BBx_TEkp.js';
import 'drizzle-orm/node-postgres';
import 'drizzle-orm/pg-core';
import './index-DBqjc0Yf.js';

//#region src/routes/api/invoices/bulk/+server.ts
var POST = async ({ request, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const landlordId = auth.value;
		const { propertyId, month, dueDate, readings, manualAmounts = {} } = await request.json();
		if (!landlordId || !propertyId || !month || !dueDate || !readings) return json({ error: "Missing required parameters" }, { status: 400 });
		if (!await landlordOwnsProperty(landlordId, propertyId)) return forbidden();
		const occupiedRooms = await db.query.rooms.findMany({
			where: and(eq(rooms.propertyId, propertyId), isNotNull(rooms.tenantId)),
			with: {
				tenant: { with: { user: true } },
				services: { with: { service: true } }
			}
		});
		if (occupiedRooms.length === 0) return json({ error: "Không tìm thấy phòng có khách đang ở trong tòa nhà này" }, { status: 400 });
		const today = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
		const createdInvoices = await db.transaction(async (tx) => {
			const results = [];
			for (const room of occupiedRooms) {
				if (!room.tenant) continue;
				if (await tx.query.invoices.findFirst({
					where: and(eq(invoices.roomId, room.id), eq(invoices.month, month)),
					columns: { id: true }
				})) continue;
				const tenantName = room.tenant.user.name;
				const tenantPhone = room.tenant.user.phone;
				const roomReadings = readings[room.id] || {};
				const roomManualAmounts = manualAmounts[room.id] || {};
				const items = [];
				let totalServicesAmount = 0;
				items.push({
					name: "Tiền phòng",
					amount: room.monthlyRent,
					details: `Tiền thuê phòng tháng ${month.split("-")[1]}/${month.split("-")[0]}`
				});
				for (const config of room.services) {
					if (!config.service.isActive) continue;
					const rate = config.customRate !== null ? config.customRate : config.service.defaultRate;
					let amount = 0;
					let details = "";
					if (config.service.type === "METERED") {
						const serviceReading = roomReadings[config.serviceId] || {
							prevValue: 0,
							currValue: 0
						};
						const prev = Number(serviceReading.prevValue) || 0;
						const curr = Number(serviceReading.currValue) || 0;
						const usage = curr - prev;
						amount = usage * rate;
						details = `Chỉ số: ${prev} -> ${curr} (${usage} ${config.service.name === "Điện" ? "kWh" : "m³"}) x ${new Intl.NumberFormat("vi-VN").format(rate)}đ`;
						await tx.insert(meterReadings).values({
							roomId: room.id,
							serviceId: config.serviceId,
							month,
							prevValue: prev,
							currValue: curr,
							recordedAt: today
						});
					} else if (config.service.type === "FLAT_ROOM") {
						amount = rate * config.quantity;
						details = `Phí cố định x ${config.quantity} phòng`;
					} else if (config.service.type === "FLAT_PERSON") {
						amount = rate * config.quantity;
						details = `Đơn giá: ${new Intl.NumberFormat("vi-VN").format(rate)}đ x ${config.quantity} người`;
					} else if (config.service.type === "FLAT_VEHICLE") {
						amount = rate * config.quantity;
						details = `Đơn giá: ${new Intl.NumberFormat("vi-VN").format(rate)}đ x ${config.quantity} xe`;
					} else if (config.service.type === "MANUAL_AMOUNT") {
						if (roomManualAmounts[config.serviceId] === void 0) throw new Error(`Thiếu số tiền ${config.service.name} cho phòng ${room.roomNumber}`);
						amount = Number(roomManualAmounts[config.serviceId]);
						if (!Number.isFinite(amount) || amount < 0) throw new Error(`Số tiền ${config.service.name} của phòng ${room.roomNumber} không hợp lệ`);
						details = `Khoản tự nhập tháng ${month}`;
					}
					if (amount > 0) {
						items.push({
							name: config.service.name,
							amount,
							details
						});
						totalServicesAmount += amount;
					}
				}
				const totalAmount = room.monthlyRent + totalServicesAmount;
				const randomHex = Math.floor(1e3 + Math.random() * 9e3).toString();
				const invoiceId = `INV-${month.replace("-", "")}-${randomHex}`;
				const inv = (await tx.insert(invoices).values({
					id: invoiceId,
					roomId: room.id,
					roomNumber: room.roomNumber,
					tenantName,
					tenantPhone,
					month,
					rentAmount: room.monthlyRent,
					totalAmount,
					dueDate,
					status: "pending",
					paidAmount: 0,
					createdAt: today,
					notes: `Hóa đơn tự động tháng ${month}`
				}).returning())[0];
				await tx.insert(invoiceItems).values(items.map((item) => ({
					...item,
					invoiceId: inv.id
				})));
				await tx.update(rooms).set({
					status: "debt",
					debtAmount: sql`coalesce(${rooms.debtAmount}, 0) + ${totalAmount}`
				}).where(eq(rooms.id, room.id));
				results.push(inv);
			}
			return results;
		});
		return json({
			success: true,
			count: createdInvoices.length,
			invoices: createdInvoices
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};
var GET = async ({ url, locals }) => {
	try {
		const auth = requireLandlord(locals.session);
		if (!auth.ok) return auth.response;
		const propertyId = url.searchParams.get("propertyId");
		const month = url.searchParams.get("month");
		if (!propertyId || !month) return json({ error: "Missing propertyId or month" }, { status: 400 });
		if (!await landlordOwnsProperty(auth.value, propertyId)) return forbidden();
		const occupiedRooms = await db.query.rooms.findMany({
			where: and(eq(rooms.propertyId, propertyId), isNotNull(rooms.tenantId)),
			with: {
				tenant: { with: { user: { columns: {
					name: true,
					phone: true
				} } } },
				services: { with: { service: true } }
			}
		});
		const roomIds = occupiedRooms.map((r) => r.id);
		const monthReadings = roomIds.length ? await db.select().from(meterReadings).where(and(inArray(meterReadings.roomId, roomIds), eq(meterReadings.month, month))) : [];
		const previousApproved = roomIds.length ? await db.select().from(meterReadings).where(and(inArray(meterReadings.roomId, roomIds), eq(meterReadings.status, "approved"))).orderBy(desc(meterReadings.month)) : [];
		const readings = {};
		for (const r of monthReadings) {
			readings[r.roomId] = readings[r.roomId] || {};
			readings[r.roomId][r.serviceId] = {
				prevValue: r.prevValue,
				currValue: r.currValue,
				status: r.status,
				photoUrl: r.photoUrl,
				isAnomalous: r.isAnomalous
			};
		}
		const prevValues = {};
		for (const r of previousApproved) {
			if (r.month >= month) continue;
			prevValues[r.roomId] = prevValues[r.roomId] || {};
			if (prevValues[r.roomId][r.serviceId] === void 0) prevValues[r.roomId][r.serviceId] = r.currValue;
		}
		return json({
			rooms: occupiedRooms,
			readings,
			prevValues
		});
	} catch (error) {
		return json({ error: errorMessage(error) }, { status: 500 });
	}
};

export { GET, POST };
//# sourceMappingURL=_server.ts-DW7Cvj-9.js.map
