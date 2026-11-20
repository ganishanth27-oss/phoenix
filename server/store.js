import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.join(__dirname, "../data");

if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getFilePath(collection) {
  return path.join(DATA_DIR, `${collection}.json`);
}

function readData(collection, defaultVal = []) {
  const file = getFilePath(collection);
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify(defaultVal, null, 2), "utf8");
    return defaultVal;
  }
  try {
    const raw = fs.readFileSync(file, "utf8");
    return JSON.parse(raw);
  } catch (e) {
    console.error(`Error reading data store ${collection}:`, e);
    return defaultVal;
  }
}

function writeData(collection, data) {
  const file = getFilePath(collection);
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
  return data;
}

// Initial defaults
const defaultQR = {
  payee_name: "Phoenix Solutions",
  upi_id: "phoenixsolutions@icici",
  payment_description: "Phoenix Solutions Project Payment",
  qr_image_url: null,
  qr_type: "static", // "static" or "dynamic"
  is_active: true,
  payment_instructions:
    "1. Open Google Pay, PhonePe, Paytm, or any UPI-supported app.\n2. Scan the Phoenix Solutions QR code or use the provided UPI ID.\n3. Verify the Payee Name displays 'Phoenix Solutions'.\n4. Enter the exact assigned amount and complete payment.\n5. Save or screenshot the transaction confirmation with UTR.\n6. Submit the screenshot and UTR in the form below for verification.",
  updated_at: new Date().toISOString(),
};

export const store = {
  getQRSettings: () => {
    return readData("qr_settings", defaultQR);
  },

  updateQRSettings: (updates) => {
    const current = store.getQRSettings();
    const updated = {
      ...current,
      ...updates,
      updated_at: new Date().toISOString(),
    };
    writeData("qr_settings", updated);
    return updated;
  },

  // Project Financials
  getFinancials: (projectId) => {
    const all = readData("project_financials", {});
    return (
      all[projectId] || {
        project_id: projectId,
        total_cost: 0,
        advance_assigned: 0,
        advance_status: "not_assigned",
        advance_due_date: null,
        payment_instructions: "",
        manager_proposal_status: "none",
        manager_proposed_amount: 0,
        manager_proposal_type: "total_cost",
        manager_proposal_notes: "",
        updated_at: new Date().toISOString(),
      }
    );
  },

  getAllFinancials: () => {
    return readData("project_financials", {});
  },

  saveFinancials: (projectId, data) => {
    const all = readData("project_financials", {});
    all[projectId] = {
      ...(all[projectId] || {}),
      ...data,
      project_id: projectId,
      updated_at: new Date().toISOString(),
    };
    writeData("project_financials", all);
    return all[projectId];
  },

  // Payment Proofs (Customer Uploads)
  getProofs: (filter = {}) => {
    let list = readData("payment_proofs", []);
    if (filter.customerId) {
      list = list.filter((p) => p.customer_id === filter.customerId);
    }
    if (filter.projectId) {
      list = list.filter((p) => p.project_id === filter.projectId);
    }
    if (filter.status) {
      list = list.filter((p) => p.verification_status === filter.status);
    }
    return list.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  addProof: (proof) => {
    const list = readData("payment_proofs", []);
    const newProof = {
      id: proof.id || "prf_" + Math.random().toString(36).substring(2, 10),
      verification_status: "pending_verification",
      created_at: new Date().toISOString(),
      ...proof,
    };
    list.unshift(newProof);
    writeData("payment_proofs", list);
    return newProof;
  },

  updateProof: (id, updates) => {
    const list = readData("payment_proofs", []);
    const idx = list.findIndex((p) => p.id === id);
    if (idx === -1) return null;
    list[idx] = {
      ...list[idx],
      ...updates,
      updated_at: new Date().toISOString(),
    };
    writeData("payment_proofs", list);
    return list[idx];
  },

  // Verified Transactions (Official ledger)
  getTransactions: (filter = {}) => {
    let list = readData("payment_transactions", []);
    if (filter.customerId) {
      list = list.filter((t) => t.customer_id === filter.customerId);
    }
    if (filter.projectId) {
      list = list.filter((t) => t.project_id === filter.projectId);
    }
    return list.sort(
      (a, b) => new Date(b.created_at) - new Date(a.created_at)
    );
  },

  addTransaction: (tx) => {
    const list = readData("payment_transactions", []);
    const newTx = {
      id: tx.id || "tx_" + Math.random().toString(36).substring(2, 10),
      receipt_number:
        "PHX-REC-" +
        new Date().getFullYear() +
        "-" +
        Math.floor(1000 + Math.random() * 9000),
      status: "verified",
      created_at: new Date().toISOString(),
      ...tx,
    };
    list.unshift(newTx);
    writeData("payment_transactions", list);
    return newTx;
  },

  // Notifications
  getNotifications: (userId) => {
    const list = readData("notifications", []);
    return list
      .filter((n) => n.user_id === userId)
      .sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
  },

  addNotification: (notif) => {
    const list = readData("notifications", []);
    const item = {
      id: "ntf_" + Math.random().toString(36).substring(2, 10),
      is_read: false,
      created_at: new Date().toISOString(),
      ...notif,
    };
    list.unshift(item);
    writeData("notifications", list);
    return item;
  },

  markNotificationsRead: (userId) => {
    const list = readData("notifications", []);
    list.forEach((n) => {
      if (n.user_id === userId) n.is_read = true;
    });
    writeData("notifications", list);
  },

  // Soft Deletion Tracking & Recovery Store
  getDeletedRecords: (category) => {
    const all = readData("deleted_items", {});
    const catList = all[category] || [];
    return catList.map((item) => item.id);
  },

  getAllDeletedItems: () => {
    const all = readData("deleted_items", {});
    const items = [];
    Object.keys(all).forEach((cat) => {
      (all[cat] || []).forEach((item) => {
        items.push({ ...item, category: cat });
      });
    });
    return items.sort((a, b) => new Date(b.deleted_at) - new Date(a.deleted_at));
  },

  addDeletedRecord: (category, id, meta = {}) => {
    const all = readData("deleted_items", {});
    all[category] = all[category] || [];
    // Prevent duplicate entries
    const existingIdx = all[category].findIndex((item) => item.id === id);
    const entry = {
      id,
      ...meta,
      deleted_at: meta.deleted_at || new Date().toISOString(),
    };
    if (existingIdx !== -1) {
      all[category][existingIdx] = entry;
    } else {
      all[category].unshift(entry);
    }
    writeData("deleted_items", all);
    return entry;
  },

  restoreDeletedRecord: (category, id) => {
    const all = readData("deleted_items", {});
    if (!all[category]) return null;
    const item = all[category].find((it) => it.id === id);
    if (!item) return null;
    all[category] = all[category].filter((it) => it.id !== id);
    writeData("deleted_items", all);
    return item;
  },
};
