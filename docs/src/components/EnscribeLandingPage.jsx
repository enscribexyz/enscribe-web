"use client"

import { useState, useRef, useEffect } from "react"
import Link from "@docusaurus/Link"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"
import { FaGithub, FaYoutube, FaTelegram, FaDiscord } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { SiFarcaster } from "react-icons/si"
import { HiArrowRight, HiMenu, HiX, HiChevronDown, HiCheck } from "react-icons/hi"
import { usePluginData } from "@docusaurus/useGlobalData"

/* ─── Animated counter ─── */
function AnimatedNumber({ target, suffix = "" }) {
  const [count, setCount] = useState(0)
  const ref = useRef(null)
  const done = useRef(false)
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => {
      if (e.isIntersecting && !done.current) {
        done.current = true
        const dur = 1600, start = performance.now()
        const step = (now) => { const p = Math.min((now - start) / dur, 1); setCount(Math.round((1 - Math.pow(1 - p, 3)) * target)); if (p < 1) requestAnimationFrame(step) }
        requestAnimationFrame(step)
      }
    }, { threshold: 0.3 })
    if (ref.current) obs.observe(ref.current)
    return () => obs.disconnect()
  }, [target])
  return <span ref={ref}>{count.toLocaleString()}{suffix}</span>
}

/* ─── Blog carousel ─── */
function LatestPostsCarousel({ limit = 6 }) {
  const scrollerRef = useRef(null)
  const { recentPosts } = usePluginData("docusaurus-plugin-related-posts")
  const items = (recentPosts || []).slice(0, limit)
  if (!items.length) return null
  const scrollBy = (dir) => { const el = scrollerRef.current; if (el) el.scrollBy({ left: Math.round(el.clientWidth * 0.9) * dir, behavior: "smooth" }) }

  return (
    <section className="py-20 md:py-28 border-t border-slate-800/60">
      <div className="container mx-auto px-4 md:px-6">
        <div className="flex items-end justify-between gap-4 mb-10">
          <div>
            <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Blog</p>
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">From the team</h2>
          </div>
          <div className="hidden sm:flex items-center gap-2">
            <button type="button" onClick={() => scrollBy(-1)} className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-white transition-colors" aria-label="Previous"><svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
            <button type="button" onClick={() => scrollBy(1)} className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-white transition-colors" aria-label="Next"><svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg></button>
          </div>
        </div>
        <div ref={scrollerRef} className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory" style={{ WebkitOverflowScrolling: "touch" }}>
          {items.map((post) => (
            <Link key={post.permalink} to={post.permalink} className="snap-start shrink-0 w-[85%] sm:w-[380px] group rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-all duration-300">
              {post.image && (<div className="h-44 w-full overflow-hidden bg-slate-900"><img src={typeof post.image === "object" ? post.image.src || post.image.default : post.image} alt={post.title} className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500" loading="lazy" /></div>)}
              <div className="p-5">
                <div className="text-xs text-slate-500 mb-2">{post.date && new Date(post.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</div>
                <h3 className="text-base font-semibold text-white group-hover:text-cyan-400 transition-colors line-clamp-2">{post.title}</h3>
              </div>
            </Link>
          ))}
        </div>
        <div className="text-center mt-6"><Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">View all posts <HiArrowRight className="w-3.5 h-3.5" /></Link></div>
      </div>
    </section>
  )
}

/* ─── Pricing card ─── */
function PricingCard({ name, price, period, tag, features, cta, ctaLink, highlight, badge, status }) {
  const isPrice = price.startsWith("$") || price === "Custom"
  return (
    <div className={`relative rounded-2xl border p-7 flex flex-col transition-all duration-300 hover:translate-y-[-2px] ${highlight ? "border-cyan-500/40 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/5" : "border-slate-800 bg-slate-900/40 hover:border-slate-700"}`}>
      {badge && (<div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20">{badge}</span></div>)}
      <h3 className="text-lg font-semibold text-white">{name}</h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-5">{tag}</p>
      <div className="mb-6 min-h-[48px] flex items-end">
        {isPrice ? (
          <><span className="text-4xl font-bold text-white">{price}</span>{period && <span className="text-slate-500 text-sm ml-1 mb-1">/{period}</span>}</>
        ) : (
          <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold border ${highlight ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/25" : "bg-slate-800/80 text-slate-300 border-slate-700/60"}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${highlight ? "bg-cyan-400 animate-pulse" : "bg-slate-500"}`} />
            {price}
          </span>
        )}
      </div>
      <ul className="space-y-2.5 mb-7 flex-1">
        {features.map((f, i) => (<li key={i} className="flex items-start gap-2 text-[13px]"><HiCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><span className="text-slate-400">{f}</span></li>))}
      </ul>
      <Link to={ctaLink} className={`w-full text-center py-3 rounded-lg text-sm font-semibold transition-all ${highlight ? "button-primary" : "text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white"}`}>{cta}</Link>
    </div>
  )
}


/* ═══════════════════════════════════ */
/*  LANDING PAGE                      */
/* ═══════════════════════════════════ */

/* ─── Free tier card with inline waitlist form ─── */
function FreePricingCard({ formspreeUrl }) {
  const [showForm, setShowForm] = useState(false)
  const [email, setEmail] = useState("")
  const [project, setProject] = useState("")
  const [status, setStatus] = useState("idle") // idle | submitting | success | error

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email) return
    setStatus("submitting")
    try {
      const res = await fetch(formspreeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, project: project || undefined, _subject: "Waitlist signup (Free)" }),
      })
      setStatus(res.ok ? "success" : "error")
    } catch {
      setStatus("error")
    }
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-7 flex flex-col hover:border-slate-700 transition-all duration-300 hover:translate-y-[-2px]">
      <h3 className="text-lg font-semibold text-white">Free</h3>
      <p className="text-xs text-slate-500 mt-0.5 mb-5">For individuals</p>
      <div className="mb-6"><span className="text-4xl font-bold text-white">$0</span><span className="text-slate-500 text-sm ml-1">/mo</span></div>
      <ul className="space-y-2.5 mb-7 flex-1">
        {["1 user, 1 namespace","Basic name management","7-day activity log","Expiry notifications","Community support"].map((f, i) => (
          <li key={i} className="flex items-start gap-2 text-[13px]"><HiCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><span className="text-slate-400">{f}</span></li>
        ))}
      </ul>

      {status === "success" ? (
        <div className="w-full text-center py-3 rounded-lg text-sm font-medium text-emerald-400 border border-emerald-500/20 bg-emerald-500/5">
          You're on the list — we'll be in touch ✓
        </div>
      ) : !showForm ? (
        <button onClick={() => setShowForm(true)} className="w-full text-center py-3 rounded-lg text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-500 hover:text-white transition-all">Join the Waitlist</button>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-2.5" onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setShowForm(false); setEmail(""); setProject(""); setStatus("idle") } }}>
          <input
            type="email"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
          />
          <input
            type="text"
            placeholder="What's your project? (optional)"
            value={project}
            onChange={(e) => setProject(e.target.value)}
            className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
          />
          <button
            type="submit"
            disabled={status === "submitting"}
            className={`w-full text-center py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? "bg-cyan-500 text-white hover:bg-cyan-400" : "bg-slate-700 text-slate-400 cursor-default"}`}
          >
            {status === "submitting" ? "Joining…" : "Join the Waitlist"}
          </button>
          {status === "error" && (
            <p className="text-xs text-red-400" style={{ textAlign: "center" }}>Something went wrong — try again or email us at <a href="mailto:hi@enscribe.xyz" className="underline">hi@enscribe.xyz</a></p>
          )}
        </form>
      )}
    </div>
  )
}

/* ─── Early access modal ─── */
function EarlyAccessModal({ isOpen, onClose, formspreeUrl, onSuccess }) {
  const [name, setName] = useState("")
  const [protocol, setProtocol] = useState("")
  const [deployed, setDeployed] = useState("")
  const [email, setEmail] = useState("")
  const [status, setStatus] = useState("idle") // idle | submitting | success | error
  const modalRef = useRef(null)

  // Trap focus, close on Escape, prevent body scroll
  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = "hidden"
    const handleKey = (e) => { if (e.key === "Escape") onClose() }
    document.addEventListener("keydown", handleKey)
    // Focus first input
    const timer = setTimeout(() => { const input = modalRef.current?.querySelector("input"); if (input) input.focus() }, 50)
    return () => { document.body.style.overflow = ""; document.removeEventListener("keydown", handleKey); clearTimeout(timer) }
  }, [isOpen, onClose])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!name || !protocol || !deployed || !email) return
    setStatus("submitting")
    try {
      const res = await fetch(formspreeUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ name, protocol, deployed, email, _subject: "Early Access Application" }),
      })
      if (res.ok) { setStatus("success"); onSuccess?.() } else { setStatus("error") }
    } catch { setStatus("error") }
  }

  const isValid = name && protocol && deployed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div ref={modalRef} className="relative w-full max-w-[480px] rounded-2xl border border-slate-700/60 bg-[#0d1220] p-6 md:p-8 shadow-2xl shadow-cyan-500/[0.06]" onClick={(e) => e.stopPropagation()}>
        {/* Close button */}
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors" aria-label="Close">
          <HiX className="w-5 h-5" />
        </button>

        {status === "success" ? (
          <div className="py-8 text-center">
            <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center mx-auto mb-4">
              <HiCheck className="w-6 h-6 text-emerald-400" />
            </div>
            <p className="text-lg font-semibold text-white mb-2">Thanks — we'll be in touch within 24 hours.</p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold text-white mb-1">Apply for Early Access</h3>
            <p className="text-xs text-slate-500 mb-6">Tell us about your project and we'll be in touch within 24 hours.</p>
            <form onSubmit={handleSubmit} className="space-y-3">
              <input type="text" required placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40" />
              <input type="email" required placeholder="Your email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40" />
              <input type="text" required placeholder="Your project/protocol, e.g. Uniswap, Nouns DAO" value={protocol} onChange={(e) => setProtocol(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40" />
              <input type="text" required placeholder="What do you manage? e.g. contracts, wallets, Safes" value={deployed} onChange={(e) => setDeployed(e.target.value)} className="w-full px-3 py-2.5 rounded-lg bg-slate-800/80 border border-slate-700 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40" />
              <button type="submit" disabled={status === "submitting"} className={`w-full text-center py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-50 ${isValid ? "bg-cyan-500 text-white hover:bg-cyan-400" : "bg-slate-700 text-slate-400 cursor-default"}`}>
                {status === "submitting" ? "Submitting…" : "Submit"}
              </button>
              {status === "error" && (
                <p className="text-xs text-red-400" style={{ textAlign: "center" }}>Something went wrong — try again or email us at <a href="mailto:hi@enscribe.xyz" className="underline">hi@enscribe.xyz</a></p>
              )}
            </form>
          </>
        )}
      </div>
    </div>
  )
}

export default function EnscribeLandingPage() {
  const { siteConfig: { customFields } } = useDocusaurusContext()
  const [menuOpen, setMenuOpen] = useState(false)
  const [faqOpen, setFaqOpen] = useState(null)
  const [showEarlyAccess, setShowEarlyAccess] = useState(false)
  const [hasApplied, setHasApplied] = useState(false)

  const openEarlyAccess = () => { if (!hasApplied) setShowEarlyAccess(true) }
  const earlyAccessLabel = hasApplied ? "Applied ✓" : "Apply for Early Access"

  const app = customFields.platformUrl || "https://platform.enscribe.xyz"
  const contact = customFields.calendarUrl

  const NAV = [
    { label: "Product", to: "#product" },
    { label: "Pricing", to: "#pricing" },
    { label: "Docs", to: "/docs" },
    { label: "Blog", to: "/blog" },
  ]

  const LOGOS = [
    { name: "Nouns DAO", logo: "img/projects/nouns.svg", url: "/blog/nouns" },
    { name: "Liquity", logo: "img/projects/liquity.png", url: "/blog/liquity" },
    { name: "Cork Protocol", logo: "img/projects/cork.svg", url: "/blog/cork" },
    { name: "Giveth", logo: "img/projects/giveth-tq.svg", url: "/blog/giveth" },
  ]

  const FEATURES = [
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" /></svg>, t: "Multi-user workspaces", d: "Your team shares a workspace with full visibility and access control." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" /></svg>, t: "Safe & multisig", d: "ENS operations work natively with your existing Safe setup." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347a1.125 1.125 0 01-1.667-.986V5.653z" /></svg>, t: "One-click execution", d: "Stage your changes, execute when you're ready — no individual transaction signing." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" /></svg>, t: "API, CLI & Agents", d: "Fine-grained API keys, CLI with MCP. Built for your team and your agents." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>, t: "Activity log", d: "Who changed what, when, from which wallet. Full audit trail." },
    { icon: <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5"><path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" /><path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" /></svg>, t: "Rich metadata", d: "Add structured information to every name in your namespace. Full on-chain profiles for your contracts and wallets." },
  ]

  const TESTIMONIALS = [
    { q: "Enscribe helped us standardize ENS naming across our deployed infrastructure so users and builders can clearly identify Nouns contracts.", who: "gramajo.eth", role: "Nouns Steward" },
    { q: "Smart contract identity is an underrated security layer. Enscribe helped us formalise how Cork's contracts are named, resolved, and represented onchain.", who: "Baptiste Florentin", role: "CTO, Cork Protocol" },
    { q: "Naming contracts increases security for users and makes sure open source development can build on a strong foundation of trust.", who: "Lauren Luz", role: "Product Lead, Giveth" },
  ]

  const ROADMAP = [
    ["Multi-user workspaces",1],["Record & metadata management",1],["Safe integration",1],["One-click execution",1],
    ["API with scoped keys",1],["CLI with MCP",1],["DNSSEC import",1],["Activity log",1],
    ["Smart account support",0],["Approval workflows",0],["Autorenewals",0],["Activity notifications",0],
    ["Custom roles & permissions",0],["ENSv2 support",0],["x402 support",0],
  ]

  const FAQS = [
    ["How is this different from the ENS App?", "ENS is the naming protocol. Enscribe is the team operations layer — like GitHub is to Git, or Cloudflare is to DNS."],
    ["Do I need a .eth name?", "No. Import your existing DNS domain via DNSSEC, or use a .eth name. Both work."],
    ["Does Enscribe have access to my names?", "You keep full ownership. Enscribe uses delegated permissions you can revoke at any time."],
    ["Does it work with Safe?", "Yes. ENS operations work natively with your existing Safe multisig."],
    ["What networks are supported?", "Ethereum, Base, Linea, Arbitrum, Optimism, and Scroll."],
  ]

  return (
    <div className="enscribe-landing bg-[#0a0e1a] text-white font-sans min-h-screen">

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity"><img src="/img/logo.svg" alt="Enscribe" className="h-7 w-7" /><span className="text-xl font-bold tracking-tight">Enscribe</span></Link>
          <nav className="hidden md:flex items-center gap-1">{NAV.map(({ label, to }) => (<Link key={label} to={to} data-noBrokenLinkCheck={to.startsWith("#")} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-md">{label}</Link>))}</nav>
          <div className="hidden md:flex items-center gap-3">
            <Link to={customFields.appUrl} className="px-4 py-2 text-sm text-slate-500 hover:text-slate-300 transition-colors">Classic App</Link>
            <button onClick={openEarlyAccess} disabled={hasApplied} className="button-primary rounded-lg text-sm disabled:opacity-60">{earlyAccessLabel}</button>
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="md:hidden text-slate-400 hover:text-white" aria-label="Menu">{menuOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}</button>
          {menuOpen && (
            <div className="absolute top-16 left-0 w-full bg-[#0a0e1a] border-t border-white/5 px-6 py-6 space-y-4 shadow-2xl z-50 md:hidden">
              {NAV.map(({ label, to }) => (<Link key={label} to={to} data-noBrokenLinkCheck={to.startsWith("#")} className="block text-lg font-medium text-slate-300 hover:text-cyan-400" onClick={() => setMenuOpen(false)}>{label}</Link>))}
              <div className="pt-4 flex flex-col gap-3">
                <Link to={customFields.appUrl} className="text-center py-2.5 text-sm text-slate-500" onClick={() => setMenuOpen(false)}>Classic App</Link>
                <button onClick={() => { setMenuOpen(false); openEarlyAccess() }} disabled={hasApplied} className="button-primary rounded-lg text-sm text-center w-full disabled:opacity-60">{earlyAccessLabel}</button>
              </div>
            </div>
          )}
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="relative pt-20 pb-20 md:pt-32 md:pb-28 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
              <div className="flex-1 max-w-xl">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 mb-6">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Built on ENS
                </div>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.5rem] font-bold tracking-tight leading-[1.08] mb-6">
                  Identity infrastructure{" "}
                  <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">for onchain teams</span>
                </h1>
                <p className="text-lg text-slate-400 mb-8 leading-relaxed max-w-md">
                  Name and manage your contracts, wallets, and agents under one namespace. As a team.
                </p>
                <div className="flex flex-wrap gap-3">
                  <button onClick={openEarlyAccess} disabled={hasApplied} className="button-primary rounded-lg disabled:opacity-60">{earlyAccessLabel} {!hasApplied && <HiArrowRight className="ml-2 w-4 h-4" />}</button>
                  <Link to="#pricing" data-noBrokenLinkCheck className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-all gap-2">Join the Waitlist</Link>
                </div>
              </div>

              {/* Namespace tree visual */}
              <div className="flex-1 w-full max-w-md lg:max-w-lg">
                <div className="rounded-xl border border-slate-700/60 bg-[#0d1220] p-6 md:p-8 font-mono text-sm shadow-2xl shadow-cyan-500/[0.08] relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/[0.03] via-transparent to-blue-500/[0.03]" />
                  <div className="relative">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-4">Namespace</div>
                    <div className="text-cyan-400 font-semibold text-base mb-3">yourprotocol.eth</div>
                    <div className="pl-4 space-y-2 border-l border-slate-700/60 ml-2">
                      {[["treasury","Safe multisig"],["governance","Governor"],["deployer","Deploy key"],["v2","Core contracts"],["agent","Automation"]].map(([n, d], i, arr) => (
                        <div key={n} className="flex items-baseline gap-2 group">
                          <span className="text-slate-700 text-xs">{i === arr.length - 1 ? "└──" : "├──"}</span>
                          <span className="text-cyan-300 group-hover:text-cyan-200 transition-colors">{n}</span>
                          <span className="text-slate-600 text-xs">· {d}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          {/* Background effects */}
          <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-[0.03]" />
          <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/[0.06] rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-blue-600/[0.04] rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* ── Logos ── */}
        <section className="py-10 border-y border-white/5">
          <div className="container mx-auto px-4">
            <p className="text-center text-xs font-medium tracking-[0.2em] text-slate-500 uppercase mb-8">Trusted by leading teams</p>
            <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
              {LOGOS.map((p) => (<Link key={p.name} to={p.url} title={p.name} className="opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"><img src={p.logo} alt={p.name} className="h-8 md:h-10 w-auto" /></Link>))}
            </div>
          </div>
        </section>

        {/* ── Two paths ── */}
        <section className="py-20 md:py-28">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Flexible</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Your .eth name or your DNS domain</h2>
              <p className="text-slate-500 text-base" style={{ textAlign: "center" }}>Both resolve onchain via ENS. Same platform, same team workflows.</p>
            </div>
            <div className="max-w-4xl mx-auto grid md:grid-cols-2 gap-6">
              <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.02] p-6 transition-all duration-300 hover:border-cyan-500/30">
                <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-cyan-400" /><span className="text-xs font-medium text-cyan-400 uppercase tracking-wider">.eth name</span></div>
                <div className="space-y-2 font-mono text-sm">
                  {["treasury","governance","deployer","v2"].map(n => (<div key={n} className="bg-slate-900/60 rounded-lg px-4 py-2.5 text-cyan-300">{n}.yourprotocol.eth</div>))}
                </div>
              </div>
              <div className="rounded-xl border border-blue-500/20 bg-blue-500/[0.02] p-6 transition-all duration-300 hover:border-blue-500/30">
                <div className="flex items-center gap-2 mb-4"><div className="w-2 h-2 rounded-full bg-blue-400" /><span className="text-xs font-medium text-blue-400 uppercase tracking-wider">DNS domain</span></div>
                <div className="space-y-2 font-mono text-sm">
                  {["treasury","governance","deployer","v2"].map(n => (<div key={n} className="bg-slate-900/60 rounded-lg px-4 py-2.5 text-blue-300">{n}.yourprotocol.com</div>))}
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section id="product" className="py-20 md:py-28 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Platform</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Built for teams, not individuals</h2>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {FEATURES.map((f, i) => (
                <div key={i} className="group rounded-xl border border-slate-800 bg-slate-900/30 p-6 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300">
                  <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 mb-4 group-hover:bg-cyan-500/15 transition-colors">{f.icon}</div>
                  <h3 className="text-sm font-semibold text-white mb-1.5">{f.t}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed">{f.d}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Dashboard preview ── */}
        <section className="py-20 md:py-28 border-t border-white/5 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Dashboard</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Your contracts, named and organised</h2>
            </div>
            <div className="max-w-5xl mx-auto">
              <div className="rounded-xl border border-slate-700/60 bg-[#0d1220] shadow-2xl shadow-cyan-500/[0.06] overflow-hidden">
                {/* Browser chrome */}
                <div className="flex items-center gap-2 px-4 py-3 border-b border-slate-800 bg-slate-900/80">
                  <div className="flex gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-700" /><div className="w-3 h-3 rounded-full bg-slate-700" /><div className="w-3 h-3 rounded-full bg-slate-700" /></div>
                  <div className="flex-1 flex justify-center"><div className="px-4 py-1 rounded-md bg-slate-800/80 text-xs text-slate-500 font-mono">platform.enscribe.xyz</div></div>
                </div>
                <div className="flex min-h-[360px]">
                  {/* Sidebar */}
                  <div className="hidden sm:flex w-48 flex-col border-r border-slate-800 bg-slate-900/40 p-4 gap-1">
                    <div className="flex items-center gap-2 mb-5">
                      <div className="w-6 h-6 rounded bg-cyan-500/20 flex items-center justify-center"><img src="/img/logo.svg" alt="" className="w-4 h-4" /></div>
                      <span className="text-xs font-semibold text-white">myprotocol</span>
                    </div>
                    {["Contracts and Wallets", "Name Management", "Activity", "Org Management"].map((item, i) => (
                      <div key={item} className={`px-3 py-2 rounded-md text-xs font-medium transition-colors ${i === 0 ? "bg-cyan-500/10 text-cyan-400" : "text-slate-500 hover:text-slate-400"}`}>{item}</div>
                    ))}
                  </div>
                  {/* Content */}
                  <div className="flex-1 p-5 md:p-6">
                    <div className="flex items-center justify-between mb-5">
                      <div>
                        <div className="text-sm font-semibold text-white">Contracts and Wallets</div>
                        <div className="text-xs text-slate-500 mt-0.5">myprotocol.eth · Ethereum Mainnet</div>
                      </div>
                      <div className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 text-xs font-medium border border-cyan-500/20 hover:bg-cyan-500/15 transition-colors cursor-default">+ Add address</div>
                    </div>
                    {/* Table */}
                    <div className="grid gap-4 text-[11px] text-slate-500 font-medium border-b border-slate-800 pb-2 uppercase tracking-wider" style={{ gridTemplateColumns: "1.1fr 0.8fr 0.8fr 1.7fr 0.7fr" }}>
                      <span>Address</span><span>Type</span><span>Chain</span><span>ENS name</span><span>Status</span>
                    </div>
                    {[
                      { addr: "0x830B…c706", type: "Contract", chain: "Ethereum", name: "governance.myprotocol.eth", ok: true },
                      { addr: "0xCCcC…0407", type: "Wallet", chain: "Base", name: "treasury.myprotocol.eth", ok: true },
                      { addr: "0x807D…EeE1", type: "Contract", chain: "Ethereum", name: "—", ok: false },
                      { addr: "0x9b95…dE81", type: "Wallet", chain: "Arbitrum", name: "ops.myprotocol.eth", ok: true },
                    ].map((r, i) => (
                      <div key={i} className="grid gap-4 text-xs py-3 border-b border-slate-800/40 items-center" style={{ gridTemplateColumns: "1.1fr 0.8fr 0.8fr 1.7fr 0.7fr" }}>
                        <span className="font-mono text-slate-400">{r.addr}</span>
                        <span className="text-slate-500">{r.type}</span>
                        <span className="text-slate-500">{r.chain}</span>
                        <span className={r.ok ? "text-cyan-400 font-mono break-all" : "text-slate-600"}>{r.name}</span>
                        <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-medium ${r.ok ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20" : "text-amber-400 bg-amber-500/10 border border-amber-500/20"}`}>{r.ok ? "Named" : "Pending"}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats section removed — metrics not meaningful for platform version */}

        {/* ── Testimonials ── */}
        <section className="py-20 md:py-28 border-t border-white/5 bg-gradient-to-b from-transparent via-slate-900/20 to-transparent">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Testimonials</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Trusted by onchain teams</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {TESTIMONIALS.map((t, i) => (
                <div key={i} className="rounded-xl border border-slate-800 bg-slate-900/30 p-6 md:p-7 hover:border-slate-700 transition-all duration-300">
                  <svg className="w-6 h-6 text-cyan-500/30 mb-4" fill="currentColor" viewBox="0 0 24 24"><path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10h-9.983zm-14.017 0v-7.391c0-5.704 3.748-9.57 9-10.609l.996 2.151c-2.433.917-3.996 3.638-3.996 5.849h3.983v10h-9.983z" /></svg>
                  <p className="text-sm text-slate-300 leading-relaxed mb-5">{t.q}</p>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-cyan-500/20 to-blue-500/20 flex items-center justify-center text-xs font-bold text-cyan-400">{t.who[0].toUpperCase()}</div>
                    <div>
                      <div className="text-sm font-medium text-white">{t.who}</div>
                      <div className="text-xs text-slate-500">{t.role}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Pricing ── */}
        <section id="pricing" className="py-20 md:py-28 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-14">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Pricing</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-4">Start free. Scale with your team.</h2>
              <p className="text-slate-500">Unlimited viewers on every plan.</p>
            </div>
            <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
              {/* Free */}
              <FreePricingCard formspreeUrl={customFields.formspreeWaitlistUrl} />

              {/* Teams */}
              <div className="rounded-2xl border border-cyan-500/40 bg-cyan-500/[0.04] shadow-lg shadow-cyan-500/5 p-7 flex flex-col transition-all duration-300 hover:translate-y-[-2px] relative">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2"><span className="px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-cyan-500 to-blue-500 text-white shadow-lg shadow-cyan-500/20">Early Access</span></div>
                <h3 className="text-lg font-semibold text-white">Teams</h3>
                <p className="text-xs text-slate-500 mt-0.5 mb-5">For teams and organisations</p>
                <div className="mb-6 flex items-end min-h-[48px]">
                  <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/25">
                    <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
                    Limited spots available
                  </span>
                </div>
                <ul className="space-y-2.5 mb-7 flex-1">
                  {["Multiple users & namespaces","Full name & metadata management","API access with scoped keys","CLI with MCP & agentic access","Activity log & notifications","Safe & multisig support","Dedicated support","Batch operations"].map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-[13px]"><HiCheck className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" /><span className="text-slate-400">{f}</span></li>
                  ))}
                </ul>
                <button onClick={openEarlyAccess} disabled={hasApplied} className="button-primary w-full text-center py-3 rounded-lg text-sm font-semibold transition-all disabled:opacity-60">{earlyAccessLabel}</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Roadmap ── */}
        <section className="py-20 md:py-28 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="text-center mb-12">
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Roadmap</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">What's shipping</h2>
            </div>
            <div className="max-w-xl mx-auto grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              {ROADMAP.map(([f, live], i) => (
                <div key={i} className="flex items-center gap-2.5 py-1">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${live ? "bg-emerald-400 shadow-sm shadow-emerald-400/50" : "bg-slate-700"}`} />
                  <span className={live ? "text-slate-300" : "text-slate-500"}>{f}</span>
                </div>
              ))}
            </div>
            <div className="flex justify-center gap-6 mt-8 text-xs text-slate-600">
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/50" /> Live</span>
              <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-slate-700" /> Coming soon</span>
            </div>
          </div>
        </section>

        {/* ── Early access ── */}
        <section className="py-20 md:py-28 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-3xl mx-auto rounded-2xl bg-slate-900/60 p-8 md:p-12 text-center relative overflow-hidden" style={{ border: "1px solid rgba(51, 65, 85, 0.4)", boxShadow: "none" }}>
              <div className="absolute inset-0" style={{ background: "linear-gradient(135deg, rgba(6,182,212,0.04), transparent, rgba(59,130,246,0.04))" }} />
              <div className="relative">
                <h2 className="text-2xl md:text-3xl font-bold text-white mb-3">Early access for teams</h2>
                <p className="text-slate-400 text-sm mb-6" style={{ textAlign: "center" }}>Namespace audit, hands-on setup, and early-access pricing. Limited spots.</p>
                <button onClick={openEarlyAccess} disabled={hasApplied} className="button-primary rounded-lg disabled:opacity-60">{earlyAccessLabel} {!hasApplied && <HiArrowRight className="ml-2 w-4 h-4" />}</button>
              </div>
            </div>
          </div>
        </section>

        {/* ── Blog ── */}
        <LatestPostsCarousel limit={6} />

        {/* ── FAQ ── */}
        <section className="py-20 md:py-28 border-t border-white/5">
          <div className="container mx-auto px-4 md:px-6">
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-10">
                <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">FAQ</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">Common questions</h2>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/30 divide-y divide-slate-800">
                {FAQS.map(([q, a], i) => (
                  <button key={i} className="w-full text-left px-6 py-5 group" onClick={() => setFaqOpen(faqOpen === i ? null : i)}>
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors pr-4">{q}</span>
                      <HiChevronDown className={`h-5 w-5 text-slate-500 shrink-0 transition-transform duration-200 ${faqOpen === i ? "rotate-180" : ""}`} />
                    </div>
                    <div className={`overflow-hidden transition-all duration-300 ${faqOpen === i ? "max-h-40 pt-3" : "max-h-0"}`}>
                      <p className="text-sm text-slate-400 leading-relaxed">{a}</p>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Final CTA ── */}
        <section className="py-24 md:py-32 border-t border-white/5 relative overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 text-center relative z-10">
            <h2 className="text-3xl md:text-5xl font-bold tracking-tight text-white mb-5">
              Give your project{" "}
              <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">a real identity</span>
            </h2>
            <p className="text-slate-500 text-lg mb-8">Free to start. No credit card.</p>
            <div className="flex justify-center gap-4">
              <button onClick={openEarlyAccess} disabled={hasApplied} className="button-primary rounded-lg text-base px-8 py-3.5 disabled:opacity-60">{earlyAccessLabel} {!hasApplied && <HiArrowRight className="ml-2 w-4 h-4" />}</button>
              <Link to="#pricing" data-noBrokenLinkCheck className="inline-flex items-center px-6 py-3.5 rounded-lg text-sm font-semibold text-slate-400 border border-slate-700 hover:border-slate-600 hover:text-white transition-all">Join the Waitlist</Link>
            </div>
          </div>
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-cyan-500/[0.04] rounded-full blur-3xl pointer-events-none" />
        </section>
      </main>

      {/* ── Early Access Modal ── */}
      <EarlyAccessModal
        isOpen={showEarlyAccess}
        onClose={() => setShowEarlyAccess(false)}
        formspreeUrl={customFields.formspreeEarlyAccessUrl}
        onSuccess={() => { setHasApplied(true); setTimeout(() => setShowEarlyAccess(false), 2500) }}
      />

      {/* ── Footer ── */}
      <footer className="border-t border-white/5 py-8">
        <div className="container mx-auto px-4 md:px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <img src="/img/logo.svg" alt="" className="h-5 w-5 opacity-60" />
            <span className="text-xs text-slate-600">&copy; {new Date().getFullYear()} Enscribe · Human-readable onchain identity for teams</span>
          </div>
          <div className="flex items-center gap-5">
            {[
              ["https://x.com/enscribe_", <FaXTwitter className="h-4 w-4" />, "X"],
              ["https://github.com/enscribexyz/enscribe", <FaGithub className="h-4 w-4" />, "GitHub"],
              ["https://www.youtube.com/@enscribexyz", <FaYoutube className="h-4 w-4" />, "YouTube"],
              ["https://t.me/enscribers", <FaTelegram className="h-4 w-4" />, "Telegram"],
              ["https://discord.gg/8QUMMdS5GY", <FaDiscord className="h-4 w-4" />, "Discord"],
              ["https://warpcast.com/enscribe", <SiFarcaster className="h-4 w-4" />, "Farcaster"],
            ].map(([to, icon, label]) => (<Link key={label} to={to} className="text-slate-600 hover:text-slate-400 transition-colors" aria-label={label}>{icon}</Link>))}
          </div>
        </div>
        <div className="container mx-auto px-4 md:px-6 mt-4 pt-4 border-t border-white/[0.03]">
          <p className="text-xs text-slate-700" style={{ textAlign: "center" }}>Looking for the original Enscribe app? <Link to={customFields.appUrl} className="text-slate-500 hover:text-slate-400 underline transition-colors">app.enscribe.xyz</Link></p>
        </div>
      </footer>
    </div>
  )
}
