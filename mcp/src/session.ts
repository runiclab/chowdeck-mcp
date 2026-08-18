/*!
 * Chowdeck MCP · session store
 * Author: Hendrix Nwaokolo (@thathman) <hello@airixmedia.com>
 * License: MIT. © 2026 Hendrix Nwaokolo.
 * Watermark: THATHMAN·CHOWDECK·MCP
 */
// Session state lives in memory for one MCP process. Manu supplies the initial
// state through CHOWDECK_SESSION_STATE_B64 and receives updated state through
// MCP result metadata, so this server never writes credentials to disk.

export type PaymentPref = {
  mode: "default" | "ask";
  methodId?: number;
  methodLabel?: string;
};

export type SessionState = {
  token: string | null;
  guestId: string | null;
  addressId: number | null;
  phone: string | null;
  paymentPref: PaymentPref | null;
};

const DEFAULTS: SessionState = {
  token: null,
  guestId: null,
  addressId: null,
  phone: null,
  paymentPref: null,
};

function loadInitialState(): SessionState {
	const encoded = process.env.CHOWDECK_SESSION_STATE_B64?.trim();
	if (!encoded) return { ...DEFAULTS };
	try {
		const decoded = Buffer.from(encoded, "base64").toString("utf8");
		return { ...DEFAULTS, ...JSON.parse(decoded) };
	} catch {
		return { ...DEFAULTS };
	}
}

// Proxy keeps the existing simple assignment style while making every update
// available to snapshot(), which Manu reads from MCP result metadata.
export const session: SessionState = new Proxy(loadInitialState(), {
	set(target, prop, value) {
		(target as any)[prop] = value;
		return true;
	},
});

export function snapshot(): SessionState {
	return { ...session, paymentPref: session.paymentPref ? { ...session.paymentPref } : null };
}

export function clearSession() {
  session.token = null;
  session.guestId = null;
  session.addressId = null;
  session.phone = null;
  session.paymentPref = null;
}
