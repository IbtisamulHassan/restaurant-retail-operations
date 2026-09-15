"use client";

import { useEffect, useState, useCallback } from "react";
import { Card, CardHeader, Badge, Button, Modal, Field, Input, toast, SkeletonRows } from "@/components/ui";
import { useLang } from "@/components/shell";
import { Store, QrCode, Plus, Pencil, Trash2, Printer, Download, Languages, Crown, Coins, AlertTriangle, Package } from "lucide-react";

type SettingsT = {
  id: number; businessName: string; logoUrl: string | null; currency: string;
  pointsPer10Taka: string; tierSilverSpend: string; tierGoldSpend: string;
  defaultLowStockThreshold: string; marginAlertPct: string; language: string;
};
type TableT = { id: number; name: string; status: string; qr: string; url: string };

export default function SettingsPage() {
  const { lang, setLang } = useLang();
  const [settings, setSettings] = useState<SettingsT | null>(null);
  const [tables, setTables] = useState<TableT[]>([]);
  const [saving, setSaving] = useState(false);
  const [tableEditor, setTableEditor] = useState<TableT | null | "new">(null);
  const [printTable, setPrintTable] = useState<TableT | null>(null);

  const load = useCallback(async () => {
    const [s, t] = await Promise.all([fetch("/api/settings"), fetch("/api/tables")]);
    setSettings((await s.json()).settings);
    setTables((await t.json()).tables ?? []);
  }, []);
  useEffect(() => { load(); }, [load]);

  const save = async (patch: Partial<SettingsT>) => {
    setSaving(true);
    const res = await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save settings");
    const data = await res.json();
    setSettings(data.settings);
    toast.success("Settings saved");
  };

  const removeTable = async (tbl: TableT) => {
    if (!confirm(`Delete ${tbl.name}? Its QR code will stop working.`)) return;
    setTables((prev) => prev.filter((x) => x.id !== tbl.id));
    const res = await fetch(`/api/tables/${tbl.id}`, { method: "DELETE" });
    if (!res.ok) { toast.error("Delete failed"); load(); return; }
    toast.success("Table deleted");
  };

  const toggleStatus = async (tbl: TableT) => {
    const next = tbl.status === "AVAILABLE" ? "OCCUPIED" : "AVAILABLE";
    setTables((prev) => prev.map((x) => (x.id === tbl.id ? { ...x, status: next } : x)));
    const res = await fetch(`/api/tables/${tbl.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: next }),
    });
    if (!res.ok) { toast.error("Failed"); load(); }
  };

  const downloadQr = (tbl: TableT) => {
    const a = document.createElement("a");
    a.href = tbl.qr;
    a.download = `${tbl.name.replace(/\s+/g, "-").toLowerCase()}-qr.png`;
    a.click();
  };

  if (!settings) return <SkeletonRows rows={6} height="h-20" />;

  return (
    <div className="space-y-5 rise-in">
      {/* identity + language */}
      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Store size={17} className="text-leaf" /> Business Profile</span>} sub="Shown on the dashboard and the QR menu page" />
          <div className="px-5 pb-5 space-y-3.5">
            <Field label="Business name">
              <Input value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} />
            </Field>
            <Field label="Logo URL (optional)" hint="Paste a link to your logo image">
              <Input value={settings.logoUrl ?? ""} onChange={(e) => setSettings({ ...settings, logoUrl: e.target.value })} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="Currency" hint="Fixed for Bangladesh">
                <Input value="BDT (৳)" disabled className="bg-stone-50 text-stone-500" />
              </Field>
              <Field label="UI Language / ভাষা">
                <div className="flex gap-2">
                  {(["en", "bn"] as const).map((l) => (
                    <button key={l} type="button" onClick={() => setLang(l)}
                      className={`flex-1 flex items-center justify-center gap-1.5 text-sm font-bold py-2.5 rounded-xl border transition cursor-pointer ${lang === l ? "bg-forest text-white border-forest" : "border-stone-300 text-stone-500"}`}>
                      <Languages size={14} /> {l === "en" ? "English" : "বাংলা"}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
            <div className="flex justify-end">
              <Button loading={saving} onClick={() => save({ businessName: settings.businessName, logoUrl: settings.logoUrl, language: lang })}>Save Profile</Button>
            </div>
          </div>
        </Card>

        <Card>
          <CardHeader title={<span className="flex items-center gap-2"><Crown size={17} className="text-saffron" /> Loyalty & Margins</span>} sub="Points, tiers and alert thresholds" />
          <div className="px-5 pb-5 space-y-3.5">
            <div className="grid grid-cols-3 gap-2">
              <Field label={<span className="flex items-center gap-1"><Coins size={11} /> Points / ৳10</span>}>
                <Input type="number" min={0} step="any" value={settings.pointsPer10Taka} onChange={(e) => setSettings({ ...settings, pointsPer10Taka: e.target.value })} />
              </Field>
              <Field label="Silver at spend (৳)">
                <Input type="number" min={0} value={settings.tierSilverSpend} onChange={(e) => setSettings({ ...settings, tierSilverSpend: e.target.value })} />
              </Field>
              <Field label="Gold at spend (৳)">
                <Input type="number" min={0} value={settings.tierGoldSpend} onChange={(e) => setSettings({ ...settings, tierGoldSpend: e.target.value })} />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label={<span className="flex items-center gap-1"><Package size={11} /> Default low-stock threshold</span>}>
                <Input type="number" min={0} step="any" value={settings.defaultLowStockThreshold} onChange={(e) => setSettings({ ...settings, defaultLowStockThreshold: e.target.value })} />
              </Field>
              <Field label={<span className="flex items-center gap-1"><AlertTriangle size={11} /> Margin alert (%)</span>} hint="Items below this margin get flagged">
                <Input type="number" min={0} max={100} value={settings.marginAlertPct} onChange={(e) => setSettings({ ...settings, marginAlertPct: e.target.value })} />
              </Field>
            </div>
            <div className="rounded-xl bg-saffron-light px-3.5 py-2.5 text-xs text-amber-800">
              Example: with {settings.pointsPer10Taka} pt/৳10, a ৳450 meal earns <b>{Math.floor((450 / 10) * Number(settings.pointsPer10Taka || 1))} points</b> on completion.
            </div>
            <div className="flex justify-end">
              <Button loading={saving} onClick={() => save({
                pointsPer10Taka: settings.pointsPer10Taka, tierSilverSpend: settings.tierSilverSpend,
                tierGoldSpend: settings.tierGoldSpend, defaultLowStockThreshold: settings.defaultLowStockThreshold,
                marginAlertPct: settings.marginAlertPct,
              })}>
                Save Loyalty & Margins
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* tables & QR */}
      <Card>
        <CardHeader
          title={<span className="flex items-center gap-2"><QrCode size={17} className="text-leaf" /> Tables & QR Codes</span>}
          sub="Customers scan a table QR to open the digital menu — no login needed"
          action={<Button size="sm" onClick={() => setTableEditor("new")}><Plus size={14} /> Add Table</Button>}
        />
        <div className="px-5 pb-5">
          {tables.length === 0 && (
            <div className="rounded-xl border-2 border-dashed border-stone-200 p-8 text-center text-sm text-stone-400">
              No tables yet. Add your first table to generate a QR code.
            </div>
          )}
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {tables.map((tbl) => (
              <div key={tbl.id} className="rounded-2xl border border-stone-200 p-4 flex gap-4 hover:shadow-md transition bg-white">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={tbl.qr} alt={`QR ${tbl.name}`} className="size-24 rounded-lg border border-stone-100 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="font-display font-semibold truncate">{tbl.name}</p>
                    <Badge color={tbl.status === "AVAILABLE" ? "green" : "amber"}>{tbl.status}</Badge>
                  </div>
                  <p className="text-[10px] text-stone-400 truncate mt-0.5">{tbl.url}</p>
                  <div className="flex flex-wrap gap-1 mt-2">
                    <Button variant="secondary" size="sm" onClick={() => window.open(`/m/${tbl.id}`, "_blank")}>Open</Button>
                    <Button variant="ghost" size="sm" onClick={() => downloadQr(tbl)} title="Download PNG"><Download size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setPrintTable(tbl)} title="Print"><Printer size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => setTableEditor(tbl)} title="Rename"><Pencil size={13} /></Button>
                    <Button variant="ghost" size="sm" onClick={() => toggleStatus(tbl)} title="Toggle occupied">{tbl.status === "AVAILABLE" ? "Occupy" : "Free"}</Button>
                    <button onClick={() => removeTable(tbl)} className="p-1.5 rounded-lg text-stone-400 hover:bg-rose-50 hover:text-rose-600 cursor-pointer"><Trash2 size={13} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* table editor modal */}
      {tableEditor && (
        <TableEditor tbl={tableEditor === "new" ? null : tableEditor} onClose={() => setTableEditor(null)} onSaved={() => { setTableEditor(null); load(); }} />
      )}

      {/* print modal */}
      {printTable && (
        <PrintQr table={printTable} businessName={settings.businessName} onClose={() => setPrintTable(null)} />
      )}
    </div>
  );
}

function TableEditor({ tbl, onClose, onSaved }: { tbl: TableT | null; onClose: () => void; onSaved: () => void }) {
  const [name, setName] = useState(tbl?.name ?? "");
  const [saving, setSaving] = useState(false);
  const save = async () => {
    if (!name.trim()) return toast.error("Table name required");
    setSaving(true);
    const res = await fetch(tbl ? `/api/tables/${tbl.id}` : "/api/tables", {
      method: tbl ? "PATCH" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    setSaving(false);
    if (!res.ok) return toast.error("Failed to save table");
    toast.success(tbl ? "Table renamed" : "Table added — QR generated");
    onSaved();
  };
  return (
    <Modal open onClose={onClose} title={tbl ? "Rename table" : "Add table"}>
      <div className="space-y-3.5">
        <Field label="Table name / number" hint="e.g. Table 7, Rooftop 2, Counter A">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Table 7" />
        </Field>
        <div className="flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={saving}>{tbl ? "Save" : "Add & Generate QR"}</Button>
        </div>
      </div>
    </Modal>
  );
}

function PrintQr({ table, businessName, onClose }: { table: TableT; businessName: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-6">
      <div className="absolute inset-0 bg-forest-deep/60 no-print" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-2xl max-w-xs w-full p-6 text-center">
        <p className="font-display text-xl font-semibold">{businessName}</p>
        <p className="text-xs uppercase tracking-[0.25em] text-stone-400 mt-1">{table.name}</p>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={table.qr} alt="QR" className="w-full my-4" />
        <p className="font-display text-lg font-semibold">Scan to Order</p>
        <p className="text-xs text-stone-400 mt-1">Point your phone camera at the code — no app or login needed.</p>
        <p className="text-[10px] text-stone-300 mt-2 break-all">{table.url}</p>
        <div className="flex gap-2 mt-4 no-print">
          <Button variant="secondary" className="flex-1" onClick={onClose}>Close</Button>
          <Button className="flex-1" onClick={() => window.print()}><Printer size={14} /> Print</Button>
        </div>
      </div>
    </div>
  );
}
