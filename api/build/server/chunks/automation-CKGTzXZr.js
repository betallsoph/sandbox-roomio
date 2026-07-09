import { d as db, f as automationJobs, n as notificationQueue, r as rooms, p as properties, i as invoices, m as meterReadings, c as services, g as contracts, j as maintenanceRequests } from './db-DPjKSjsC.js';
import { and, eq, lt, inArray, desc, isNotNull, ne, sql, gte, lte } from 'drizzle-orm';

//#region src/lib/server/automation.ts
var today = () => (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
var AUTOMATION_LOG_RETENTION_DAYS = 90;
var NOTIFICATION_HISTORY_RETENTION_DAYS = 180;
var retentionCutoff = (days) => {
	const date = /* @__PURE__ */ new Date();
	date.setDate(date.getDate() - days);
	return date;
};
var addDays = (days) => {
	const d = /* @__PURE__ */ new Date();
	d.setDate(d.getDate() + days);
	return d.toISOString().split("T")[0];
};
async function cleanupAutomationHistory(landlordId) {
	await Promise.all([db.delete(automationJobs).where(and(eq(automationJobs.landlordId, landlordId), lt(automationJobs.createdAt, retentionCutoff(AUTOMATION_LOG_RETENTION_DAYS)))), db.delete(notificationQueue).where(and(eq(notificationQueue.landlordId, landlordId), inArray(notificationQueue.status, [
		"sent",
		"failed",
		"dismissed"
	]), lt(notificationQueue.createdAt, retentionCutoff(NOTIFICATION_HISTORY_RETENTION_DAYS))))]);
}
function monthLabel(month) {
	const [year, monthNumber] = month.split("-");
	return `${monthNumber}/${year}`;
}
async function runOverdueSweep(landlordId) {
	const roomIdsSubquery = db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId));
	return { overdueInvoices: (await db.update(invoices).set({ status: "overdue" }).where(and(inArray(invoices.roomId, roomIdsSubquery), inArray(invoices.status, ["pending", "partial"]), lt(invoices.dueDate, today()))).returning()).length };
}
async function queueInvoiceReminders(landlordId) {
	const rows = await db.query.invoices.findMany({
		where: and(inArray(invoices.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId))), inArray(invoices.status, [
			"pending",
			"partial",
			"overdue"
		])),
		with: { room: { with: {
			tenant: { with: { user: { columns: {
				id: true,
				name: true
			} } } },
			property: { columns: { shortName: true } }
		} } },
		orderBy: [desc(invoices.month)]
	});
	let queued = 0;
	for (const invoice of rows) {
		const tenant = invoice.room.tenant;
		if (!tenant) continue;
		if (await db.query.notificationQueue.findFirst({
			where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.type, "invoice_reminder"), eq(notificationQueue.relatedType, "invoice"), eq(notificationQueue.relatedId, invoice.id), ne(notificationQueue.status, "dismissed")),
			columns: { id: true }
		})) continue;
		await db.insert(notificationQueue).values({
			landlordId,
			tenantId: tenant.id,
			recipientUserId: tenant.user.id,
			type: "invoice_reminder",
			channel: "in_app",
			title: `Nhắc thanh toán hóa đơn ${invoice.id}`,
			content: `Phòng ${invoice.room.property.shortName}-${invoice.roomNumber} còn cần thanh toán ${new Intl.NumberFormat("vi-VN").format(invoice.totalAmount - invoice.paidAmount)}đ cho tháng ${monthLabel(invoice.month)}.`,
			status: "queued",
			relatedType: "invoice",
			relatedId: invoice.id,
			scheduledFor: today()
		});
		queued += 1;
	}
	return { queuedInvoiceReminders: queued };
}
async function queueMeterReminders(landlordId, month) {
	const occupiedRooms = await db.query.rooms.findMany({
		where: and(isNotNull(rooms.tenantId), inArray(rooms.propertyId, db.select({ id: properties.id }).from(properties).where(eq(properties.landlordId, landlordId)))),
		with: {
			property: { columns: { shortName: true } },
			tenant: { with: { user: { columns: {
				id: true,
				name: true
			} } } },
			services: { with: { service: true } }
		}
	});
	let queued = 0;
	for (const room of occupiedRooms) {
		if (!room.tenant) continue;
		const meteredConfigs = room.services.filter((config) => config.service.type === "METERED" && config.service.isActive);
		if (meteredConfigs.length === 0) continue;
		const existingReadings = await db.select({ serviceId: meterReadings.serviceId }).from(meterReadings).where(and(eq(meterReadings.roomId, room.id), eq(meterReadings.month, month)));
		const submittedServiceIds = new Set(existingReadings.map((reading) => reading.serviceId));
		const missingServices = meteredConfigs.filter((config) => !submittedServiceIds.has(config.serviceId));
		if (missingServices.length === 0) continue;
		if (await db.query.notificationQueue.findFirst({
			where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.type, "meter_reminder"), eq(notificationQueue.relatedType, "room"), eq(notificationQueue.relatedId, room.id), ne(notificationQueue.status, "dismissed")),
			columns: { id: true }
		})) continue;
		await db.insert(notificationQueue).values({
			landlordId,
			tenantId: room.tenant.id,
			recipientUserId: room.tenant.user.id,
			type: "meter_reminder",
			channel: "in_app",
			title: `Nhắc gửi chỉ số phòng ${room.roomNumber}`,
			content: `Phòng ${room.property.shortName}-${room.roomNumber} chưa có chỉ số ${missingServices.map((s) => s.service.name).join(", ")} cho tháng ${monthLabel(month)}.`,
			status: "queued",
			relatedType: "room",
			relatedId: room.id,
			scheduledFor: today()
		});
		queued += 1;
	}
	return { queuedMeterReminders: queued };
}
async function queueContractReminders(landlordId) {
	const rows = await db.query.contracts.findMany({
		where: and(inArray(contracts.roomId, db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId))), eq(contracts.status, "active"), gte(contracts.endDate, today()), lte(contracts.endDate, addDays(30))),
		with: {
			tenant: { with: { user: { columns: {
				id: true,
				name: true
			} } } },
			room: { with: { property: { columns: { shortName: true } } } }
		}
	});
	let queued = 0;
	for (const contract of rows) {
		if (await db.query.notificationQueue.findFirst({
			where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.type, "contract_reminder"), eq(notificationQueue.relatedType, "contract"), eq(notificationQueue.relatedId, contract.id), ne(notificationQueue.status, "dismissed")),
			columns: { id: true }
		})) continue;
		await db.insert(notificationQueue).values({
			landlordId,
			tenantId: contract.tenantId,
			recipientUserId: contract.tenant.user.id,
			type: "contract_reminder",
			channel: "in_app",
			title: `Hợp đồng phòng ${contract.room.roomNumber} sắp hết hạn`,
			content: `${contract.tenant.user.name} - phòng ${contract.room.property.shortName}-${contract.room.roomNumber} hết hạn hợp đồng ngày ${contract.endDate}.`,
			status: "queued",
			relatedType: "contract",
			relatedId: contract.id,
			scheduledFor: today()
		});
		queued += 1;
	}
	return { queuedContractReminders: queued };
}
async function runAutomationJob(landlordId, type, payload = {}) {
	const job = (await db.insert(automationJobs).values({
		landlordId,
		type,
		status: "running",
		scheduledFor: today(),
		startedAt: /* @__PURE__ */ new Date(),
		payload: JSON.stringify(payload)
	}).returning())[0];
	try {
		let result = {};
		if (type === "overdue_sweep") result = await runOverdueSweep(landlordId);
		else if (type === "invoice_reminder") result = await queueInvoiceReminders(landlordId);
		else if (type === "meter_reminder") result = await queueMeterReminders(landlordId, String(payload.month ?? (/* @__PURE__ */ new Date()).toISOString().slice(0, 7)));
		else if (type === "contract_reminder") result = await queueContractReminders(landlordId);
		else throw new Error("Loại automation không hợp lệ");
		return (await db.update(automationJobs).set({
			status: "completed",
			completedAt: /* @__PURE__ */ new Date(),
			result: JSON.stringify(result)
		}).where(eq(automationJobs.id, job.id)).returning())[0];
	} catch (error) {
		const message = error instanceof Error ? error.message : "Unexpected automation error";
		return (await db.update(automationJobs).set({
			status: "failed",
			completedAt: /* @__PURE__ */ new Date(),
			result: JSON.stringify({ error: message })
		}).where(eq(automationJobs.id, job.id)).returning())[0];
	}
}
async function getCentralInbox(landlordId) {
	const roomIdsSubquery = db.select({ id: rooms.id }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(eq(properties.landlordId, landlordId));
	const [overdueInvoices, proofs, pendingMeters, expiringContracts, openRequests, queuedNotifications] = await Promise.all([
		db.query.invoices.findMany({
			where: and(inArray(invoices.roomId, roomIdsSubquery), inArray(invoices.status, ["overdue", "partial"])),
			with: { room: { with: { property: { columns: { shortName: true } } } } },
			orderBy: [desc(invoices.dueDate)]
		}),
		db.query.invoices.findMany({
			where: and(inArray(invoices.roomId, roomIdsSubquery), isNotNull(invoices.paymentProofImage), ne(invoices.status, "paid")),
			with: { room: { with: { property: { columns: { shortName: true } } } } }
		}),
		db.select({
			id: meterReadings.id,
			month: meterReadings.month,
			roomNumber: rooms.roomNumber,
			propertyName: properties.shortName,
			serviceName: services.name,
			status: meterReadings.status,
			isAnomalous: meterReadings.isAnomalous
		}).from(meterReadings).innerJoin(rooms, eq(meterReadings.roomId, rooms.id)).innerJoin(properties, eq(rooms.propertyId, properties.id)).leftJoin(services, eq(meterReadings.serviceId, services.id)).where(and(eq(properties.landlordId, landlordId), sql`(${meterReadings.status} = 'pending' OR ${meterReadings.isAnomalous} = true)`)).orderBy(desc(meterReadings.month)),
		db.query.contracts.findMany({
			where: and(inArray(contracts.roomId, roomIdsSubquery), eq(contracts.status, "active"), gte(contracts.endDate, today()), lte(contracts.endDate, addDays(30))),
			with: {
				tenant: { with: { user: { columns: { name: true } } } },
				room: { with: { property: { columns: { shortName: true } } } }
			}
		}),
		db.query.maintenanceRequests.findMany({
			where: and(inArray(maintenanceRequests.tenantId, db.select({ id: rooms.tenantId }).from(rooms).innerJoin(properties, eq(rooms.propertyId, properties.id)).where(and(eq(properties.landlordId, landlordId), isNotNull(rooms.tenantId)))), inArray(maintenanceRequests.status, ["pending", "in_progress"])),
			with: { tenant: { with: { user: { columns: { name: true } } } } },
			orderBy: desc(maintenanceRequests.createdAt)
		}),
		db.query.notificationQueue.findMany({
			where: and(eq(notificationQueue.landlordId, landlordId), eq(notificationQueue.status, "queued")),
			orderBy: desc(notificationQueue.createdAt)
		})
	]);
	return {
		counts: {
			overdueInvoices: overdueInvoices.length,
			paymentProofs: proofs.length,
			meterIssues: pendingMeters.length,
			expiringContracts: expiringContracts.length,
			openRequests: openRequests.length,
			queuedNotifications: queuedNotifications.length
		},
		items: [
			...overdueInvoices.map((invoice) => ({
				id: `invoice:${invoice.id}`,
				type: "invoice",
				priority: "high",
				title: `Hóa đơn ${invoice.id} chưa thu đủ`,
				description: `${invoice.room.property.shortName}-${invoice.roomNumber} còn ${new Intl.NumberFormat("vi-VN").format(invoice.totalAmount - invoice.paidAmount)}đ`,
				href: "/dashboard/invoices",
				createdAt: invoice.dueDate
			})),
			...proofs.map((invoice) => ({
				id: `proof:${invoice.id}`,
				type: "payment",
				priority: "high",
				title: `Có bill chờ đối soát`,
				description: `${invoice.room.property.shortName}-${invoice.roomNumber} đã gửi ảnh thanh toán cho hóa đơn ${invoice.id}`,
				href: "/dashboard/invoices",
				createdAt: invoice.createdAt
			})),
			...pendingMeters.map((reading) => ({
				id: `meter:${reading.id}`,
				type: "meter",
				priority: reading.isAnomalous ? "high" : "normal",
				title: reading.isAnomalous ? "Chỉ số điện nước bất thường" : "Chỉ số chờ duyệt",
				description: `${reading.propertyName}-${reading.roomNumber} · ${reading.serviceName ?? "Dịch vụ"} · ${reading.month}`,
				href: "/dashboard/meters",
				createdAt: reading.month
			})),
			...expiringContracts.map((contract) => ({
				id: `contract:${contract.id}`,
				type: "contract",
				priority: "normal",
				title: `Hợp đồng sắp hết hạn`,
				description: `${contract.tenant.user.name} · ${contract.room.property.shortName}-${contract.room.roomNumber} · ${contract.endDate}`,
				href: "/dashboard/contracts",
				createdAt: contract.endDate
			})),
			...openRequests.map((request) => ({
				id: `request:${request.id}`,
				type: "request",
				priority: request.priority === "important" ? "high" : "normal",
				title: request.title,
				description: `${request.tenant.user.name} · ${request.buildingName}-${request.roomNumber}`,
				href: "/dashboard/requests",
				createdAt: request.createdAt.toISOString()
			})),
			...queuedNotifications.map((notification) => ({
				id: `notification:${notification.id}`,
				type: "notification",
				priority: "normal",
				title: notification.title,
				description: notification.content,
				href: "/dashboard/notifications",
				createdAt: notification.createdAt.toISOString()
			}))
		]
	};
}

export { cleanupAutomationHistory as c, getCentralInbox as g, runAutomationJob as r };
//# sourceMappingURL=automation-CKGTzXZr.js.map
