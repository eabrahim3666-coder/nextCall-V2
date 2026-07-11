"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input"; // Make sure to add this via npx shadcn-ui@latest add input if you haven't

type BusinessData = {
    business_name: string;
    business_type: string;
    service_area: string;
    twilio_numbers?: string[];
    plan_type?: string;
};

export default function SettingsForm({ initialData }: { initialData: BusinessData }) {
    const [data, setData] = useState<BusinessData>(initialData);
    const [loading, setLoading] = useState(false);
    const [success, setSuccess] = useState(false);
    const [phoneNumbers, setPhoneNumbers] = useState<string[]>(initialData.twilio_numbers || []);
    const [addingNumber, setAddingNumber] = useState(false);
    const [numberError, setNumberError] = useState("");

    const handleAddNumber = async () => {
        setAddingNumber(true);
        setNumberError("");
        try {
            const res = await fetch('/api/numbers/add', { method: 'POST' });
            const result = await res.json();
            if (res.ok && result.phoneNumber) {
                setPhoneNumbers([...phoneNumbers, result.phoneNumber]);
            } else {
                setNumberError(result.error || "Failed to add number");
            }
        } catch {
            setNumberError("Network error");
        } finally {
            setAddingNumber(false);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setSuccess(false);

        try {
            const res = await fetch('/api/business/update-settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });

            if (res.ok) {
                setSuccess(true);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-lg">
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
                <Input
                    value={data.business_name}
                    onChange={(e) => setData({ ...data, business_name: e.target.value })}
                    placeholder="e.g. London Fast Plumbing"
                />
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Business Type / Industry</label>
                <Input
                    value={data.business_type}
                    onChange={(e) => setData({ ...data, business_type: e.target.value })}
                    placeholder="e.g. Plumber, Dentist, Real Estate"
                />
                <p className="text-xs text-gray-500 mt-1">This changes how the AI detects emergencies.</p>
            </div>

            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Service Area</label>
                <Input
                    value={data.service_area}
                    onChange={(e) => setData({ ...data, service_area: e.target.value })}
                    placeholder="e.g. London and 15-mile radius"
                />
                <p className="text-xs text-gray-500 mt-1">The AI will reject leads outside this area.</p>
            </div>

            <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save AI Settings"}
            </Button>

            {success && <p className="text-sm text-green-600 font-medium mt-2">✅ Settings updated! AI will use these on the next call.</p>}

            {/* Phone Numbers Section */}
            <div className="pt-6 mt-6 border-t border-gray-200">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Your Phone Numbers</h3>
                <div className="space-y-2 mb-4">
                    {phoneNumbers.length > 0 ? (
                        phoneNumbers.map((num, i) => (
                            <div key={i} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 px-3 py-2 rounded-md border border-gray-200">
                                <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" /></svg>
                                {num}
                            </div>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500">No numbers assigned yet. They will appear here after payment.</p>
                    )}
                </div>

                {data.plan_type === 'premium' && phoneNumbers.length < 3 ? (
                    <Button type="button" variant="outline" onClick={handleAddNumber} disabled={addingNumber}>
                        {addingNumber ? "Purchasing..." : "+ Add New Number"}
                    </Button>
                ) : data.plan_type !== 'premium' ? (
                    <p className="text-xs text-gray-500 mt-1">Upgrade to Premium to add up to 3 numbers.</p>
                ) : (
                    <p className="text-xs text-gray-500 mt-1">Maximum limit of 3 numbers reached.</p>
                )}
                {numberError && <p className="text-sm text-red-600 font-medium mt-2">⚠️ {numberError}</p>}
            </div>
        </form>
    );
}