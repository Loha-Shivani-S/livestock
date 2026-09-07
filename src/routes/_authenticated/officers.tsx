import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getAlertRecipients,
  saveAlertRecipient,
  deleteAlertRecipient,
  testAlertRecipient,
  getNotificationsHistory,
} from "@/lib/data-client";
import { useI18n } from "@/lib/i18n";
import { UserCheck, UserPlus, Phone, Mail, MapPin, Send, Trash2, Edit2, ShieldAlert, CheckCircle2, Bell, AlertTriangle, Radio } from "lucide-react";
import { toast } from "sonner";
import { AudioSpeakButton } from "@/components/AudioSpeakButton";
import { VernacularAlertModal } from "@/components/VernacularAlertModal";

export const Route = createFileRoute("/_authenticated/officers")({
  component: OfficersPage,
  head: () => ({
    meta: [
      { title: "Officer Alert Directory — HerdSentinel" },
      { name: "description", content: "Manage Block Veterinary Officers, phone numbers and email destinations for automated alerts." },
    ],
  }),
});

function OfficersPage() {
  const { t } = useI18n();
  const qc = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [vernacularOpen, setVernacularOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [designation, setDesignation] = useState("Block Veterinary Officer (BVO)");
  const [phone, setPhone] = useState("+91 ");
  const [email, setEmail] = useState("");
  const [block, setBlock] = useState("Gobichettipalayam");
  const [district, setDistrict] = useState("Erode");
  const [active, setActive] = useState(true);

  const { data: officers, isLoading } = useQuery({
    queryKey: ["alert-recipients"],
    queryFn: () => getAlertRecipients(),
  });

  const { data: notifications } = useQuery({
    queryKey: ["notifications-history"],
    queryFn: () => getNotificationsHistory(),
    refetchInterval: 10000,
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setDesignation("Block Veterinary Officer (BVO)");
    setPhone("+91 ");
    setEmail("");
    setBlock("Gobichettipalayam");
    setDistrict("Erode");
    setActive(true);
    setModalOpen(false);
  };

  const startEdit = (officer: any) => {
    setEditingId(officer.id);
    setName(officer.full_name);
    setDesignation(officer.designation);
    setPhone(officer.phone || "+91 ");
    setEmail(officer.email || "");
    setBlock(officer.block);
    setDistrict(officer.district);
    setActive(officer.active);
    setModalOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: saveAlertRecipient,
    onSuccess: () => {
      toast.success(editingId ? "Officer details updated" : "New officer registered for alerts");
      qc.invalidateQueries({ queryKey: ["alert-recipients"] });
      resetForm();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteAlertRecipient,
    onSuccess: () => {
      toast.success("Officer removed from alert recipient list");
      qc.invalidateQueries({ queryKey: ["alert-recipients"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const testMutation = useMutation({
    mutationFn: testAlertRecipient,
    onSuccess: () => {
      toast.success("Test alert dispatched via SMS & Email! Check the dispatch log below.", {
        duration: 5000,
      });
      qc.invalidateQueries({ queryKey: ["notifications-history"] });
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({
      id: editingId || undefined,
      full_name: name,
      designation,
      phone,
      email,
      block,
      district,
      active,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Officer Directory & Alert Destinations</h1>
          <p className="text-sm text-muted-foreground">
            Configure Block Veterinary Officers, phone numbers and email routing for automated disease outbreak alerts.
          </p>
        </div>
        <div className="flex items-center flex-wrap gap-2">
          <AudioSpeakButton
            text={`Officer alert directory. ${officers?.length ?? 0} veterinary officers configured across Gobichettipalayam and Erode blocks for automated escalation.`}
            variant="outline"
            label="Directory Audio"
          />
          <button
            type="button"
            onClick={() => setVernacularOpen(true)}
            className="inline-flex items-center gap-2 rounded-md border border-primary/50 bg-primary/10 px-3.5 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition shadow-sm"
          >
            <Radio className="h-4 w-4" />
            Regional Broadcast (IVR/SMS)
          </button>
          <button
            type="button"
            onClick={() => {
              resetForm();
              setModalOpen(true);
            }}
            className="inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-semibold text-primary-foreground hover:bg-primary/90 shadow-sm"
          >
            <UserPlus className="h-4 w-4" />
            Add Officer Recipient
          </button>
        </div>
      </div>

      {/* Officers List */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(officers ?? []).map((o) => (
          <div key={o.id} className="panel p-5 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="font-semibold text-base">{o.full_name}</h3>
                <p className="text-xs text-primary font-medium">{o.designation}</p>
              </div>
              <span
                className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                  o.active ? "bg-low-soft text-low" : "bg-muted text-muted-foreground"
                }`}
              >
                {o.active ? "ALERTS ACTIVE" : "PAUSED"}
              </span>
            </div>

            <div className="space-y-2 text-xs text-muted-foreground border-y border-border py-3">
              <div className="flex items-center gap-2">
                <Phone className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span className="font-mono text-foreground">{o.phone || "No phone registered"}</span>
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span className="truncate text-foreground">{o.email || "No email registered"}</span>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="h-3.5 w-3.5 text-foreground shrink-0" />
                <span>Block {o.block}, District {o.district}</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                onClick={() => testMutation.mutate({ recipient_id: o.id })}
                disabled={testMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded border border-input bg-card px-2.5 py-1 text-xs font-semibold hover:bg-accent disabled:opacity-50"
              >
                <Send className="h-3 w-3 text-primary" />
                Send Test Alert
              </button>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => startEdit(o)}
                  className="rounded p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                  aria-label="Edit"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Remove ${o.full_name} from alert recipients?`)) {
                      deleteMutation.mutate({ id: o.id });
                    }
                  }}
                  className="rounded p-1.5 text-muted-foreground hover:bg-critical/10 hover:text-critical"
                  aria-label="Delete"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Notifications Audit Feed */}
      <div className="panel p-5">
        <div className="flex items-center justify-between mb-3 border-b border-border pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-sm font-semibold flex items-center gap-2">
                <Bell className="h-4 w-4 text-primary" />
                Automated SMS & Email Alert Dispatch Log
              </h2>
              <AudioSpeakButton
                text={`Automated alert dispatch log. ${notifications?.length ?? 0} emergency notifications dispatched via SMS and email to block veterinary officers.`}
                variant="badge"
                label="Dispatch Audio"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Real-time audit log of outgoing notifications triggered by high BDI collar events, mortality reports, and lab confirmations.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {notifications?.length ?? 0} dispatched
          </span>
        </div>

        <div className="space-y-3">
          {(!notifications || notifications.length === 0) && (
            <p className="text-xs text-muted-foreground py-4 text-center">No notifications recorded yet.</p>
          )}
          {(notifications ?? []).map((n) => (
            <div key={n.id} className="rounded-lg border border-border bg-surface p-3.5 text-xs">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${
                      n.channel === "sms" ? "bg-primary/20 text-primary" : "bg-secondary text-secondary-foreground"
                    }`}
                  >
                    {n.channel}
                  </span>
                  <span className="font-semibold text-foreground">{n.recipient}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-low-soft px-2 py-0.5 text-[10px] font-bold text-low">
                    {n.status === "sent" ? "SENT" : "DELIVERED"}
                  </span>
                  <span className="text-[10px] text-muted-foreground font-mono">
                    {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>
              <p className="mt-2 font-medium text-foreground">{n.subject}</p>
              <p className="mt-1 font-mono text-[11px] text-muted-foreground leading-relaxed bg-muted/40 p-2 rounded">
                {n.body}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Add / Edit Officer Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="font-display text-lg font-bold">
              {editingId ? "Edit Officer Contact" : "Register Alert Recipient"}
            </h2>
            <p className="text-xs text-muted-foreground mb-4">
              Enter phone number for instant SMS alerts and email for disease advisory broadcasts.
            </p>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="label-caps mb-1.5 block">Full Name</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Dr. Suresh Patil"
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              <div>
                <label className="label-caps mb-1.5 block">Designation / Role</label>
                <select
                  value={designation}
                  onChange={(e) => setDesignation(e.target.value)}
                  className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option>Block Veterinary Officer (BVO)</option>
                  <option>District Veterinary Officer (DVO)</option>
                  <option>Live-stock Development Officer (LDO)</option>
                  <option>Para-veterinary Field Supervisor</option>
                  <option>Disease Surveillance Epidemiologist</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-caps mb-1.5 block">Phone Number (SMS)</label>
                  <input
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+91 98220 12345"
                    className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="label-caps mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="officer@ahd-mh.gov.in"
                    className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="label-caps mb-1.5 block">Assigned Block</label>
                  <input
                    required
                    value={block}
                    onChange={(e) => setBlock(e.target.value)}
                    className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="label-caps mb-1.5 block">District</label>
                  <input
                    required
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full rounded-md border border-input bg-surface px-3 py-2 text-sm"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="active"
                  checked={active}
                  onChange={(e) => setActive(e.target.checked)}
                  className="rounded border-input text-primary focus:ring-ring"
                />
                <label htmlFor="active" className="text-xs font-semibold text-foreground">
                  Enable active SMS and Email alert delivery for this officer
                </label>
              </div>

              <div className="mt-6 flex items-center justify-end gap-2 border-t border-border pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-md border border-input px-4 py-2 text-xs font-semibold hover:bg-accent"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={saveMutation.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
                >
                  {saveMutation.isPending ? "Saving..." : editingId ? "Update Officer" : "Save Officer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Vernacular Voice & SMS Broadcast Modal */}
      <VernacularAlertModal
        isOpen={vernacularOpen}
        onClose={() => setVernacularOpen(false)}
        village="Gobichettipalayam"
        tagId="ALL-SECTORS"
        disease="Foot-and-Mouth Disease (FMD)"
      />
    </div>
  );
}
