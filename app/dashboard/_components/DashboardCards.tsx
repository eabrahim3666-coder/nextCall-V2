"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Pencil, ArrowLeft, Save, Trash2, Phone, Clock, Smartphone } from "lucide-react";

type Call = {
    call_id: string;
    customer_phone: string;
    summary: string;
    call_duration: number;
    created_at: string;
    is_flagged?: boolean;
};

type PhoneNumber = {
    number: string;
    label: string;
};

export default function DashboardCards({ calls, minutesUsed, totalCalls, activeNumbers, planType }: { calls: Call[], minutesUsed: number, totalCalls: number, activeNumbers: PhoneNumber[], planType: string }) {
    const [localCalls, setLocalCalls] = useState<Call[]>(calls);
    const [localNumbers, setLocalNumbers] = useState<PhoneNumber[]>(activeNumbers);
    const [buyingNumber, setBuyingNumber] = useState(false);

    const [view, setView] = useState<"list" | "edit" | "delete">("list");
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [editLabel, setEditLabel] = useState("");
    const [deleteInput, setDeleteInput] = useState("");

    const handleToggleFlag = async (callId: string, currentFlagStatus: boolean) => {
        setLocalCalls(prev => prev.map(c => c.call_id === callId ? { ...c, is_flagged: !currentFlagStatus } : c));
        await fetch('/api/calls/toggle-flag', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ call_id: callId, is_flagged: !currentFlagStatus })
        });
    };

    const handleBuyNumber = async () => {
        setBuyingNumber(true);
        try {
            const res = await fetch('/api/numbers/add', { method: 'POST' });
            const data = await res.json();
            if (data.phoneNumber) {
                setLocalNumbers(prev => [...prev, { number: data.phoneNumber, label: "New Number" }]);
            } else {
                alert(data.error || "Failed to buy number");
            }
        } catch (error) { console.error(error); }
        finally { setBuyingNumber(false); }
    };

    const handleSaveLabel = () => {
        if (selectedIndex === null) return;
        setLocalNumbers(prev => prev.map((n, i) => i === selectedIndex ? { ...n, label: editLabel } : n));
        setView("list");
    };

    const handleRemoveNumber = async () => {
        if (selectedIndex === null || deleteInput !== "delete") return;
        const numberToRemove = localNumbers[selectedIndex].number;
        try {
            await fetch('/api/numbers/remove', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phoneNumber: numberToRemove })
            });
            setLocalNumbers(prev => prev.filter((_, i) => i !== selectedIndex));
            setView("list");
        } catch (error) { console.error(error); }
    };

    const openEditView = (index: number) => {
        setSelectedIndex(index);
        setEditLabel(localNumbers[index].label);
        setView("edit");
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Card 1: Total Calls */}
            <div className="bg-black border border-white/5 p-6 rounded-2xl hover:border-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20">
                        <Phone className="h-5 w-5 text-[#ff4b00]" />
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <p className="text-xs font-medium text-[#ff4b00] hover:text-[#ff4b00] cursor-pointer underline underline-offset-2">View History</p>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0a0a0a] border border-white/5 text-white max-w-2xl">
                            <DialogHeader><DialogTitle className="text-xl text-white font-bold">Call History</DialogTitle></DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto mt-4">
                                {localCalls.length === 0 ? <p className="text-[#A7ADBB] text-center py-8 text-sm">No calls yet.</p> : (
                                    <div className="space-y-3">
                                        {localCalls.map((call) => (
                                            <div key={call.call_id} className={`p-4 border rounded-lg flex justify-between items-start ${call.is_flagged ? 'bg-amber-500/5 border-amber-500/20' : 'bg-black border-white/5'}`}>
                                                <div className="space-y-1">
                                                    <p className="font-semibold text-white text-sm">{call.customer_phone}</p>
                                                    <p className="text-xs text-[#A7ADBB]">{call.summary || "No summary"}</p>
                                                    <p className="text-xs text-neutral-600">{new Date(call.created_at).toLocaleString()}</p>
                                                </div>
                                                <Button variant="ghost" size="sm" className={call.is_flagged ? "text-amber-400 hover:text-amber-300" : "text-neutral-600 hover:text-white"} onClick={() => handleToggleFlag(call.call_id, call.is_flagged || false)}>
                                                    {call.is_flagged ? "Bookmarked" : "Flag"}
                                                </Button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <h3 className="text-sm font-medium text-[#A7ADBB] uppercase tracking-wider">Total Calls</h3>
                <p className="text-3xl font-bold text-white mt-1">{totalCalls}</p>
            </div>

            {/* Card 2: Minutes Used */}
            <div className="bg-black border border-white/5 p-6 rounded-2xl hover:border-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                        <Clock className="h-5 w-5 text-emerald-400" />
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <p className="text-xs font-medium text-emerald-400 hover:text-emerald-300 cursor-pointer underline underline-offset-2">View Breakdown</p>
                        </DialogTrigger>
                        <DialogContent className="bg-[#0a0a0a] border border-white/5 text-white max-w-2xl">
                            <DialogHeader><DialogTitle className="text-xl text-white font-bold">Minutes Breakdown</DialogTitle></DialogHeader>
                            <div className="max-h-[60vh] overflow-y-auto mt-4">
                                {localCalls.length === 0 ? <p className="text-[#A7ADBB] text-center py-8 text-sm">No minutes logged yet.</p> : (
                                    <div className="space-y-3">
                                        {localCalls.map((call) => (
                                            <div key={call.call_id} className="p-4 border border-white/5 rounded-lg flex justify-between items-center bg-black">
                                                <div><p className="font-semibold text-white text-sm">{call.customer_phone}</p><p className="text-xs text-neutral-600">{new Date(call.created_at).toLocaleString()}</p></div>
                                                <p className="text-lg font-bold text-white">{(call.call_duration / 60).toFixed(1)} <span className="text-xs font-normal text-[#A7ADBB]">min</span></p>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <h3 className="text-sm font-medium text-[#A7ADBB] uppercase tracking-wider">Minutes Used</h3>
                <p className="text-3xl font-bold text-white mt-1">{Number(minutesUsed || 0).toFixed(1)} <span className="text-lg font-normal text-[#A7ADBB]">min</span></p>
            </div>

            {/* Card 3: Active Number Management */}
            <div className="bg-black border border-white/5 p-6 rounded-2xl hover:border-white/5 transition-colors">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-[#ff4b00]/10 border border-[#ff4b00]/20">
                        <Smartphone className="h-5 w-5 text-[#ff4b00]" />
                    </div>
                    <Dialog>
                        <DialogTrigger asChild>
                            <p className="text-xs font-medium text-[#ff4b00] hover:text-cyan-300 cursor-pointer underline underline-offset-2">Manage Numbers</p>
                        </DialogTrigger>

                        <DialogContent className="bg-[#0a0a0a] border border-white/5 text-white sm:max-w-md">
                            <DialogHeader>
                                <DialogTitle className="text-xl text-white font-bold flex items-center gap-3">
                                    {view !== "list" && (
                                        <button onClick={() => setView("list")} className="text-[#A7ADBB] hover:text-white transition-colors">
                                            <ArrowLeft className="h-5 w-5" />
                                        </button>
                                    )}
                                    {view === "list" ? "Manage Numbers" : view === "edit" ? "Edit Number" : "Delete Number"}
                                </DialogTitle>
                            </DialogHeader>

                            <div className="mt-4 min-h-[200px]">
                                {/* VIEW 1: List */}
                                {view === "list" && (
                                    <div className="space-y-3">
                                        {localNumbers.map((numObj, index) => (
                                            <div key={numObj.number} className="flex items-center justify-between p-3 border border-white/5 rounded-lg bg-black">
                                                <div>
                                                    <p className="font-mono font-semibold text-white text-sm">{numObj.number}</p>
                                                    <p className="text-xs text-[#A7ADBB]">{numObj.label}</p>
                                                </div>
                                                <Button variant="ghost" size="icon" className="hover:bg-black" onClick={() => openEditView(index)}>
                                                    <Pencil className="h-4 w-4 text-[#A7ADBB] hover:text-[#ff4b00]" />
                                                </Button>
                                            </div>
                                        ))}
                                        {planType === "premium" ? (
                                            <Button onClick={handleBuyNumber} disabled={buyingNumber} className="w-full bg-indigo-600 hover:bg-[#ff4b00] mt-4 text-sm font-medium">
                                                {buyingNumber ? "Buying..." : "+ Add New Number"}
                                            </Button>
                                        ) : (
                                            <p className="text-xs text-[#A7ADBB] text-center mt-4">Extra numbers are available on the Premium plan.</p>
                                        )}
                                    </div>
                                )}

                                {/* VIEW 2: Edit Panel */}
                                {view === "edit" && selectedIndex !== null && (
                                    <div className="space-y-5">
                                        <div>
                                            <label className="block text-xs font-medium text-[#A7ADBB] mb-1">Phone Number (Cannot be changed)</label>
                                            <Input value={localNumbers[selectedIndex].number} disabled className="bg-black border-white/5 text-[#A7ADBB] font-mono text-sm" />
                                        </div>

                                        <div>
                                            <label className="block text-xs font-medium text-[#A7ADBB] mb-1">Label / Nickname</label>
                                            <Input
                                                value={editLabel}
                                                onChange={(e) => setEditLabel(e.target.value)}
                                                placeholder="e.g. Main Website Line"
                                                className="bg-black border-white/5 text-white placeholder-neutral-700 focus:border-indigo-500/50 text-sm"
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button
                                                variant="outline"
                                                className="flex-1 border-white/5 text-[#A7ADBB] hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20"
                                                onClick={() => setView("delete")}
                                            >
                                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                                            </Button>
                                            <Button
                                                className="flex-1 bg-indigo-600 hover:bg-[#ff4b00]"
                                                onClick={handleSaveLabel}
                                            >
                                                <Save className="h-4 w-4 mr-2" /> Save
                                            </Button>
                                        </div>
                                    </div>
                                )}

                                {/* VIEW 3: Delete Confirmation */}
                                {view === "delete" && selectedIndex !== null && (
                                    <div className="space-y-4 bg-red-500/5 p-6 border border-red-500/20 rounded-xl">
                                        <p className="text-red-400 font-bold text-lg">Are you absolutely sure?</p>
                                        <p className="text-[#A7ADBB] text-sm">This will permanently delete <span className="font-mono font-bold text-white">{localNumbers[selectedIndex].number}</span>.</p>

                                        <div>
                                            <label className="block text-sm font-medium text-[#A7ADBB] mb-1">
                                                Type <span className="font-mono bg-black px-1.5 py-0.5 rounded font-bold text-white text-xs">delete</span> to confirm.
                                            </label>
                                            <Input
                                                value={deleteInput}
                                                onChange={(e) => setDeleteInput(e.target.value)}
                                                className="bg-black border-white/5 text-white placeholder-neutral-700 focus:border-red-500/50 text-sm"
                                                placeholder="Type 'delete' here..."
                                            />
                                        </div>

                                        <div className="flex gap-3 pt-2">
                                            <Button variant="outline" className="flex-1 border-white/5 text-[#A7ADBB] hover:bg-black text-sm" onClick={() => setView("edit")}>
                                                Cancel
                                            </Button>
                                            <Button
                                                variant="destructive"
                                                className="flex-1 bg-red-600 hover:bg-red-500 text-sm"
                                                disabled={deleteInput !== "delete"}
                                                onClick={handleRemoveNumber}
                                            >
                                                Delete Number
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
                <h3 className="text-sm font-medium text-[#A7ADBB] uppercase tracking-wider">Active Numbers</h3>
                <p className="text-3xl font-bold text-white mt-1">{localNumbers.length}</p>
            </div>

        </div>
    );
}