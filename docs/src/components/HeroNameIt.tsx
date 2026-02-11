// Hero component for landing page which allows people to name their contracts

import React, { useEffect, useMemo, useRef, useState } from "react";

function randomHexAddress() {
    const buf = new Uint8Array(20);
    (globalThis.crypto || window.crypto).getRandomValues(buf);
    return "0x" + Array.from(buf).map(b => b.toString(16).padStart(2, "0")).join("");
}

export default function HeroNameIt() {
    const [address, setAddress] = useState("");
    const [ensName, setEnsName] = useState("");
    const [demoRunning, setDemoRunning] = useState(true);
    const [idx, setIdx] = useState(0);
    const [showCursor, setShowCursor] = useState(true); // typing caret pulse
    const [addrFlash, setAddrFlash] = useState(false);

    const cycleTimer = useRef<number | null>(null);
    const typerTimer = useRef<number | null>(null);

    const examples = useMemo(
        () => [
            { address: "0xbb9bc244d798123fde783fcc1c72d3bb8c189413", name: "thedao.eth" },
            { address: "0x66a9893cC07D91D95644AEDD05D03f95e1dBA8Af", name: "v4.router.uniswap.eth" },
            { address: "0xd01607c3C5eCABa394D8be377a08590149325722", name: "eth-staking.aave.eth" },
            { address: "0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48", name: "usdc.circle.eth" },
            { address: "0x283Af0B28c62C092C9727F1Ee09c02CA627EB7F5", name: "registrar.ens.eth" },
            { address: "0xC18360217D8F7Ab5e7c516566761Ea12Ce7F9D72", name: "token.ensdao.eth" },
            { address: "0x9b95a964db0ab154a587cc667b4964bd5dd8de81", name: "v2.app.enscribe.eth" },
            () => ({ address: randomHexAddress(), name: "v1.yourapp.eth" }),
        ],
        []
    );

    // caret pulse
    useEffect(() => {
        const t = window.setInterval(() => setShowCursor((c) => !c), 500);
        return () => clearInterval(t);
    }, []);

    // “type” the name character by character
    const typeName = (full: string) => {
        if (typerTimer.current) window.clearTimeout(typerTimer.current);
        setEnsName("");
        let i = 0;
        const step = () => {
            i++;
            setEnsName(full.slice(0, i));
            if (i < full.length) {
                typerTimer.current = window.setTimeout(step, 50 + Math.random() * 60);
            }
        };
        typerTimer.current = window.setTimeout(step, 250);
    };

    // Cycle examples until user interacts
    useEffect(() => {
        if (!demoRunning) return;

        const apply = () => {
            const item = examples[idx % examples.length];
            const pair = typeof item === "function" ? item() : item;
            setAddress(pair.address);
            setAddrFlash(true);
            window.setTimeout(() => setAddrFlash(false), 450);

            typeName(pair.name);
        };

        apply();
        cycleTimer.current = window.setInterval(() => setIdx((i) => i + 1), 3200);

        return () => {
            if (cycleTimer.current) window.clearInterval(cycleTimer.current);
            if (typerTimer.current) window.clearTimeout(typerTimer.current);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [idx, demoRunning, examples]);

    const stopDemoAndClearIfDemo = () => {
        if (!demoRunning) return;          // ⬅️ only clear once
        if (cycleTimer.current) window.clearInterval(cycleTimer.current);
        if (typerTimer.current) window.clearTimeout(typerTimer.current);
        setDemoRunning(false);
        setAddress("");
        setEnsName("");
    };

    const isHexAddr = /^0x[a-fA-F0-9]{40}$/.test(address.trim());

    const onSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!isHexAddr) return;
        const url = new URL("https://app.enscribe.xyz/nameContract");
        url.searchParams.set("contract", address.trim());
        url.searchParams.set("chainId", "1");
        window.open(url.toString(), "_blank", "noopener,noreferrer");
    };

    return (
        <form
            onSubmit={onSubmit}
            className="group relative w-full max-w-xl p-6 rounded-2xl border border-white/[0.06]
                 bg-[#0d1220]/80 backdrop-blur-lg shadow-[0_0_25px_rgba(0,0,0,0.5)]
                 hover:shadow-[0_0_40px_rgba(103,232,249,0.1)] transition-all duration-500 overflow-hidden"
        >
            {/* ambient glow */}
            <div className="pointer-events-none absolute -inset-px rounded-2xl
                      bg-gradient-to-r from-cyan-500/10 via-transparent to-blue-600/10
                      opacity-0 group-hover:opacity-100 blur-xl transition duration-700" />

            <div className="relative z-10">
                <h3 className="text-xl font-semibold text-slate-50 mb-1 text-center">Name a Smart
                    Contract</h3>
                <p className="text-slate-400 text-sm text-center mb-6">
                    Paste a contract address below
                </p>

                {/* Address */}
                <label className="block text-slate-200 text-sm mb-1">Contract address</label>
                <input
                    value={address}
                    onFocus={stopDemoAndClearIfDemo}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="0x…"
                    className={`w-full mb-4 bg-slate-900/70 text-slate-100 rounded-lg px-4 py-3
                     border border-slate-700 focus:border-cyan-400 focus:ring-2
                     focus:ring-cyan-500/30 outline-none transition-all duration-300
                     placeholder:text-slate-500 font-mono ${addrFlash ? "animate-input-flash" : ""}`}
                    autoComplete="off"
                    spellCheck={false}
                />
                {!isHexAddr && address && (
                    <p className="text-xs text-amber-300 -mt-3 mb-3">Enter a valid 0x-prefixed
                        address.</p>
                )}

                {/* Name */}
                <label className="block text-slate-200 text-sm mb-1">Name</label>
                <input
                    readOnly
                    value={demoRunning ? `${ensName}${showCursor ? "|" : " "}` : ensName}
                    onFocus={stopDemoAndClearIfDemo}
                    onChange={(e) => setEnsName(e.target.value)}
                    placeholder="your-awesome-name.eth"
                    className="w-full mb-4 bg-slate-900/70 text-slate-100 rounded-lg px-4 py-3
                     border border-slate-700  outline-none transition-all duration-300
                     placeholder:text-slate-500 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                />

                {!demoRunning && (
                    <p className="text-slate-400 text-xs mt-1 italic">
                        Click below to start naming
                    </p>
                )}


                {/* CTA */}
                <button
                    type="submit"
                    disabled={!isHexAddr}
                    className={`relative overflow-hidden w-full font-semibold text-white rounded-lg transition-all duration-300 p-3 group/button
            ${!isHexAddr
                        ? "opacity-50 cursor-not-allowed bg-slate-700"
                        : "bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 hover:shadow-xl hover:shadow-pink-500/50 focus:ring-4 focus:ring-pink-500/50 hover:-translate-y-0.5"
                    }`}
                    title={!isHexAddr ? "Enter a valid contract address" : "Name it!"}
                >
                    <span className="relative z-10">✨ Name it!</span>

                    {/* Shine sweep */}
                    <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600/0 via-white/70 to-purple-600/0
            opacity-0 group-hover/button:opacity-100 group-hover/button:animate-shine pointer-events-none blur-sm"/>

                    {/* Outer glow */}
                    <span className="absolute -inset-1 rounded-lg bg-gradient-to-r from-purple-600 via-pink-500 to-red-500
            opacity-0 group-hover/button:opacity-70 group-hover/button:blur-md transition-all duration-300 pointer-events-none"/>
                </button>

                {demoRunning && (
                    <p className="mt-3 text-xs text-slate-300/80 text-center">
                        (Click to try naming a contract)
                    </p>
                )}
            </div>
        </form>
    );
}