const manifest = (() => {
function __memo(fn) {
	let value;
	return () => value ??= (value = fn());
}

return {
	appDir: "_app",
	appPath: "_app",
	assets: new Set([]),
	mimeTypes: {},
	_: {
		client: {start:"_app/immutable/entry/start.vLut1-SH.js",app:"_app/immutable/entry/app.Dyp-lGHw.js",imports:["_app/immutable/entry/start.vLut1-SH.js","_app/immutable/chunks/XIwxr4zK.js","_app/immutable/chunks/BlMtw-PB.js","_app/immutable/entry/app.Dyp-lGHw.js","_app/immutable/chunks/BlMtw-PB.js","_app/immutable/chunks/kNaey6uv.js","_app/immutable/chunks/xihTtKlq.js"],stylesheets:[],fonts:[],uses_env_dynamic_public:false},
		nodes: [
			__memo(() => import('./chunks/0-CsN4i3yR.js')),
			__memo(() => import('./chunks/1-eL4jzy5U.js'))
		],
		remotes: {
			
		},
		routes: [
			{
				id: "/",
				pattern: /^\/$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DJ-4M8Bn.js'))
			},
			{
				id: "/api/announcements",
				pattern: /^\/api\/announcements\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BAtiKwHr.js'))
			},
			{
				id: "/api/auth",
				pattern: /^\/api\/auth\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-PdbQHFND.js'))
			},
			{
				id: "/api/auth/telegram",
				pattern: /^\/api\/auth\/telegram\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cxiajy0L.js'))
			},
			{
				id: "/api/automation",
				pattern: /^\/api\/automation\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ZtoWUzWV.js'))
			},
			{
				id: "/api/contracts",
				pattern: /^\/api\/contracts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Ds67-INM.js'))
			},
			{
				id: "/api/dashboard/stats",
				pattern: /^\/api\/dashboard\/stats\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-aEGJ2-Hk.js'))
			},
			{
				id: "/api/expenses",
				pattern: /^\/api\/expenses\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DZu00En-.js'))
			},
			{
				id: "/api/files/[name]",
				pattern: /^\/api\/files\/([^/]+?)\/?$/,
				params: [{"name":"name","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B1XyPQI-.js'))
			},
			{
				id: "/api/finance",
				pattern: /^\/api\/finance\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BiqW2HQW.js'))
			},
			{
				id: "/api/inbox",
				pattern: /^\/api\/inbox\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-B-sPOSoq.js'))
			},
			{
				id: "/api/invoices",
				pattern: /^\/api\/invoices\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BrHJesyn.js'))
			},
			{
				id: "/api/invoices/bulk",
				pattern: /^\/api\/invoices\/bulk\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DW7Cvj-9.js'))
			},
			{
				id: "/api/invoices/[id]",
				pattern: /^\/api\/invoices\/([^/]+?)\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DNjhJccm.js'))
			},
			{
				id: "/api/invoices/[id]/payment-link",
				pattern: /^\/api\/invoices\/([^/]+?)\/payment-link\/?$/,
				params: [{"name":"id","optional":false,"rest":false,"chained":false}],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Co7eoZL7.js'))
			},
			{
				id: "/api/messages",
				pattern: /^\/api\/messages\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BPzvl1Nz.js'))
			},
			{
				id: "/api/meter-readings",
				pattern: /^\/api\/meter-readings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-D4-NpxX1.js'))
			},
			{
				id: "/api/notifications",
				pattern: /^\/api\/notifications\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-ssvONCKs.js'))
			},
			{
				id: "/api/payment-webhook",
				pattern: /^\/api\/payment-webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CXuMxmNN.js'))
			},
			{
				id: "/api/payments",
				pattern: /^\/api\/payments\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-TDJEPcyi.js'))
			},
			{
				id: "/api/payos-connect",
				pattern: /^\/api\/payos-connect\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Cq99oY1k.js'))
			},
			{
				id: "/api/payos-webhook",
				pattern: /^\/api\/payos-webhook\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-s3uSzaE9.js'))
			},
			{
				id: "/api/payos-webhook/subscription",
				pattern: /^\/api\/payos-webhook\/subscription\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-us7m0YA_.js'))
			},
			{
				id: "/api/properties",
				pattern: /^\/api\/properties\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Ch3C9LDO.js'))
			},
			{
				id: "/api/requests",
				pattern: /^\/api\/requests\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DfkCSIKf.js'))
			},
			{
				id: "/api/rooms",
				pattern: /^\/api\/rooms\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-De2qd4aA.js'))
			},
			{
				id: "/api/services",
				pattern: /^\/api\/services\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BM-AqjOp.js'))
			},
			{
				id: "/api/settings",
				pattern: /^\/api\/settings\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DVcGCqtV.js'))
			},
			{
				id: "/api/staff",
				pattern: /^\/api\/staff\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BmnZqOv7.js'))
			},
			{
				id: "/api/subscription/quote",
				pattern: /^\/api\/subscription\/quote\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-GYcAjepk.js'))
			},
			{
				id: "/api/subscription/requests",
				pattern: /^\/api\/subscription\/requests\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CZVz9uv_.js'))
			},
			{
				id: "/api/super-admin",
				pattern: /^\/api\/super-admin\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DBK6gK9T.js'))
			},
			{
				id: "/api/support-contacts",
				pattern: /^\/api\/support-contacts\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-CePdv1fC.js'))
			},
			{
				id: "/api/telegram-deliveries",
				pattern: /^\/api\/telegram-deliveries\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-Da7fvV9U.js'))
			},
			{
				id: "/api/tenant-invites",
				pattern: /^\/api\/tenant-invites\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-BNRIxBiU.js'))
			},
			{
				id: "/api/tenants",
				pattern: /^\/api\/tenants\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-f5VkR5Hw.js'))
			},
			{
				id: "/api/uploads/presign",
				pattern: /^\/api\/uploads\/presign\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DfZ3H6AA.js'))
			},
			{
				id: "/api/upload",
				pattern: /^\/api\/upload\/?$/,
				params: [],
				page: null,
				endpoint: __memo(() => import('./chunks/_server.ts-DHztZiNg.js'))
			}
		],
		prerendered_routes: new Set([]),
		matchers: async () => {
			
			return {  };
		},
		server_assets: {}
	}
}
})();

const prerendered = new Set([]);

const base = "";

export { base, manifest, prerendered };
//# sourceMappingURL=manifest.js.map
