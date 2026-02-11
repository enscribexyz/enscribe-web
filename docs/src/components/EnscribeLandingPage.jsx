"use client"

import { useState, useRef, useEffect } from "react"
import Link from "@docusaurus/Link"
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { FaGithub, FaTelegram, FaDiscord } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { SiFarcaster } from "react-icons/si";
import { HiArrowRight, HiMenu, HiX, HiChevronDown } from "react-icons/hi"
import HeroNameIt from "./HeroNameIt";

import blogPostListProp from "@generated/docusaurus-plugin-content-blog/default/blog-post-list-prop-default"

/* ─── Animated number counter ─── */
function AnimatedNumber({ target, suffix = "", prefix = "" }) {
  const [count, setCount] = useState(0);
  const ref = useRef(null);
  const hasAnimated = useRef(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasAnimated.current) {
            hasAnimated.current = true;
            const duration = 1600;
            const start = performance.now();
            const step = (now) => {
              const progress = Math.min((now - start) / duration, 1);
              const eased = 1 - Math.pow(1 - progress, 3);
              setCount(Math.round(eased * target));
              if (progress < 1) requestAnimationFrame(step);
            };
            requestAnimationFrame(step);
          }
        },
        { threshold: 0.3 }
    );
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target]);

  return <span ref={ref}>{prefix}{count.toLocaleString()}{suffix}</span>;
}

/* ─── Blog carousel ─── */
function LatestPostsCarousel({ limit = 6 }) {
  const scrollerRef = useRef(null)

  const items = (blogPostListProp?.items || []).slice(0, limit)

  // If blog plugin is disabled or there are no posts
  if (!items.length) return null

  const scrollBy = (direction) => {
    const el = scrollerRef.current
    if (!el) return
    const amount = Math.round(el.clientWidth * 0.9) * direction
    el.scrollBy({ left: amount, behavior: "smooth" })
  }

  return (
      <section className="py-20 md:py-28 border-t border-slate-800/60">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex items-end justify-between gap-4 mb-10">
            <div>
              <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Blog</p>
              <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                Latest from the team
              </h2>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <button
                  type="button"
                  onClick={() => scrollBy(-1)}
                  className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-white transition-colors"
                  aria-label="Previous posts"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
              <button
                  type="button"
                  onClick={() => scrollBy(1)}
                  className="p-2.5 rounded-lg border border-slate-700 bg-slate-800/60 hover:bg-slate-700 text-white transition-colors"
                  aria-label="Next posts"
              >
                <svg width="16" height="16" fill="none" viewBox="0 0 16 16"><path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
          </div>

          <div
              ref={scrollerRef}
              className="flex gap-6 overflow-x-auto pb-4 no-scrollbar scroll-smooth snap-x snap-mandatory"
              style={{ WebkitOverflowScrolling: "touch" }}
          >
            {items.map((post) => (
                <Link
                    key={post.permalink}
                    to={post.permalink}
                    className="snap-start shrink-0 w-[85%] sm:w-[400px] group rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden hover:border-slate-700 transition-all duration-300"
                >
                  {post.image && (
                      <div className="h-48 w-full overflow-hidden bg-slate-900">
                        <img
                            src={typeof post.image === 'object' ? post.image.src || post.image.default : post.image}
                            alt={post.title}
                            className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                            loading="lazy"
                        />
                      </div>
                  )}
                  <div className="p-6">
                    <div className="text-xs text-slate-500 mb-3 font-medium">
                      {post.date && new Date(post.date).toLocaleDateString(undefined, {
                        year: "numeric", month: "short", day: "numeric",
                      })}
                    </div>
                    <h3 className="text-lg font-semibold text-white mb-2 group-hover:text-cyan-400 transition-colors">
                      {post.title}
                    </h3>
                    {post.description && (
                        <p className="text-slate-400 text-sm line-clamp-2">{post.description}</p>
                    )}
                  </div>
                </Link>
            ))}
          </div>

          <div className="text-center mt-8">
            <Link to="/blog" className="inline-flex items-center gap-2 text-sm font-medium text-slate-400 hover:text-cyan-400 transition-colors">
              View all posts <HiArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>
  )
}

/* ─── FAQ ─── */
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false)
  return (
      <div className="border-b border-slate-800 last:border-0">
        <button
            className="w-full flex justify-between items-center py-5 text-left group"
            onClick={() => setIsOpen(!isOpen)}
        >
          <h3 className="text-base font-medium text-slate-200 group-hover:text-white transition-colors pr-4">{question}</h3>
          <HiChevronDown className={`h-5 w-5 text-slate-500 shrink-0 transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`} />
        </button>
        <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 pb-5" : "max-h-0"}`}>
          <div className="text-slate-400 text-sm leading-relaxed">{answer}</div>
        </div>
      </div>
  )
}


export default function EnscribeLandingPage() {
  const {
    siteConfig: { customFields },
  } = useDocusaurusContext();

  const [menuOpen, setMenuOpen] = useState(false);

  const PARTNERS = [
    { name: 'Nouns DAO', logo: 'img/projects/nouns.svg', url: '/blog/nouns' },
    { name: 'Liquity', logo: 'img/projects/liquity.png', url: '/blog/liquity' },
    { name: 'Cork Protocol', logo: 'img/projects/cork.svg', url: '/blog/cork' },
    { name: 'Giveth', logo: 'img/projects/giveth-tq.svg', url: '/blog/giveth', invertInDark: true, scale: 1.2 },
  ];

  const NETWORKS = [
    { name: "Ethereum", icon: "eth" },
    { name: "Base", icon: "base" },
    { name: "Linea", icon: "linea" },
    { name: "Arbitrum", icon: "arb" },
    { name: "Optimism", icon: "op" },
    { name: "Scroll", icon: "scroll" },
  ];

  const faqs = [
    {
      question: "Which protocols are already using Enscribe?",
      answer: (
          <>
            Leading ecosystem projects including <strong className="text-slate-200">Nouns DAO</strong>, <strong className="text-slate-200">Liquity</strong>, <strong className="text-slate-200">Cork Protocol</strong>, and <strong className="text-slate-200">Giveth</strong> use Enscribe to name their contract infrastructure using ENS.
          </>
      ),
    },
    {
      question: "Why should my protocol use Enscribe?",
      answer:
          "Smart contracts on Ethereum are still identified by hex addresses. That's fine for machines, but not people. ENS can name smart contracts, but most teams never operationalise it at protocol scale. Enscribe gives you the infrastructure to name and manage your contracts using ENS, ensuring your protocol's identity is onchain, not buried in stale documentation.",
    },
    {
      question: "What networks do you support?",
      answer: "We support networks where ENS is deployed, including Ethereum, Base, Linea, Arbitrum, Optimism, and Scroll.",
    },
    {
      question: "Can I name existing contracts?",
      answer:
          "Yes. If you already have deployed contracts, you can assign ENS names through Enscribe using your own ENS names or one of ours.",
    },
    {
      question: "How does Enscribe work?",
      answer:
          "Enscribe makes it simple to attach ENS names to smart contracts. You can use the Enscribe App to deploy and name a smart contract atomically in a single transaction. For existing contracts, set ENS subnames to resolve to deployed addresses. Names are written onchain and can be verified by anyone using ENS resolution."
    },
    {
      question: "What is a Smart Contract Naming Audit?",
      answer:
          "For established protocols, naming existing onchain infrastructure takes planning. A Contract Naming Audit is a structured review the Enscribe team undertakes of your deployed contracts and operational wallets. We create a consistent onchain naming scheme using ENS. The output is a complete onchain directory of your protocol that's easier to verify and maintain over time.",
    },
    {
      question: "Could Enscribe steal my ENS names?",
      answer:
          "No. Enscribe uses the manager role for an ENS name. You retain full ownership and can override or delete any actions performed by the service at any time.",
    },
    {
      question: "What happens if my domain expires?",
      answer:
          "Just like with domain names, if your ENS name lapses and someone else takes ownership of it, the subnames issued by Enscribe are no longer valid. We recommend keeping your ENS names renewed.",
    },
  ]

  return (
      <div className="enscribe-landing bg-[#0a0e1a] text-white font-sans min-h-screen">
        {/* ── Navbar ── */}
        <header className="sticky top-0 z-50 w-full border-b border-white/5 bg-[#0a0e1a]/80 backdrop-blur-xl">
          <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
            <Link to="/" className="flex items-center gap-2.5 hover:opacity-90 transition-opacity">
              <img src="/img/logo.svg" alt="Enscribe" className="h-7 w-7" />
              <span className="text-xl font-bold tracking-tight">Enscribe</span>
            </Link>

            <nav className="hidden md:flex items-center gap-1">
              {[
                { label: "Features", to: "#features" },
                { label: "Services", to: "#services" },
                { label: "Docs", to: "/docs" },
                { label: "Guides", to: "/guides" },
                { label: "Blog", to: "/blog" },
              ].map(({ label, to }) => (
                  <Link key={label} to={to} className="px-3 py-2 text-sm text-slate-400 hover:text-white transition-colors rounded-md">
                    {label}
                  </Link>
              ))}
            </nav>

            <div className="hidden md:flex items-center gap-3">
              <Link
                  to={customFields.calendarUrl}
                  className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white border border-slate-700 hover:border-slate-600 rounded-lg transition-all"
              >
                Talk to a human
              </Link>
              <Link to={customFields.appUrl} className="button-primary rounded-lg text-sm">
                Launch App
              </Link>
            </div>

            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="md:hidden text-slate-400 hover:text-white"
                aria-label="Toggle menu"
            >
              {menuOpen ? <HiX className="h-6 w-6" /> : <HiMenu className="h-6 w-6" />}
            </button>

            {menuOpen && (
                <div className="absolute top-16 left-0 w-full bg-[#0a0e1a] border-t border-white/5 px-6 py-6 space-y-4 shadow-2xl z-50 md:hidden">
                  {[
                    { label: "Features", to: "#features" },
                    { label: "Services", to: "#services" },
                    { label: "Docs", to: "/docs" },
                    { label: "Guides", to: "/guides" },
                    { label: "Blog", to: "/blog" },
                  ].map(({ label, to }) => (
                      <Link key={label} to={to} className="block text-lg font-medium text-slate-300 hover:text-cyan-400" onClick={() => setMenuOpen(false)}>
                        {label}
                      </Link>
                  ))}
                  <div className="pt-4 flex flex-col gap-3">
                    <Link to={customFields.calendarUrl} className="text-center py-2.5 text-sm font-medium text-slate-300 border border-slate-700 rounded-lg" onClick={() => setMenuOpen(false)}>
                      Talk to us
                    </Link>
                    <Link to={customFields.appUrl} className="button-primary rounded-lg text-sm text-center" onClick={() => setMenuOpen(false)}>
                      Launch App
                    </Link>
                  </div>
                </div>
            )}
          </div>
        </header>

        <main className="flex-1">
          {/* ── Announcement bar ── */}
          <div className="w-full border-b border-white/5 py-2.5 px-4">
            <div className="container mx-auto flex items-center justify-center gap-2 text-sm">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              New
            </span>
              <span className="text-slate-400">
              Smart Contract Naming Audits for protocol teams
            </span>
              <Link to="/audit" className="text-cyan-400 font-medium hover:text-cyan-300 transition-colors">
                Learn more <span aria-hidden="true">&rarr;</span>
              </Link>
            </div>
          </div>

          {/* ── Hero ── */}
          <section className="relative pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
            <div className="container mx-auto px-4 md:px-6 relative z-10">
              <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">
                <div className="flex-1 max-w-2xl">
                  <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-slate-800/80 text-slate-300 border border-slate-700/60 mb-6">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Trusted by Nouns DAO, Liquity, Cork &amp; more
                  </div>

                  <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] mb-6">
                    <span className="text-white">Give your smart contracts </span>
                    <span className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">a real identity</span>
                  </h1>

                  <p className="text-lg text-slate-400 max-w-xl mb-8 leading-relaxed">
                    Your users interact with hex addresses they can't read or verify. Enscribe gives every contract a human-readable ENS name &mdash; onchain, verifiable, and permanent.
                  </p>

                  <div className="flex flex-wrap gap-3">
                    <Link to={customFields.appUrl} className="button-primary rounded-lg">
                      Launch App
                      <HiArrowRight className="ml-2 w-4 h-4" />
                    </Link>
                    <Link
                        to={customFields.calendarUrl}
                        className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-all gap-2"
                    >
                      Book a call
                    </Link>
                  </div>
                </div>

                <div className="flex-1 w-full max-w-xl lg:max-w-none">
                  <HeroNameIt />
                </div>
              </div>
            </div>

            {/* Background grid */}
            <div className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center opacity-[0.03]" />
            {/* Gradient orbs */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-cyan-500/5 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[400px] h-[400px] bg-blue-600/5 rounded-full blur-3xl pointer-events-none" />
          </section>

          {/* ── Logos ── */}
          <section className="py-10 border-y border-white/5">
            <div className="container mx-auto px-4">
              <p className="text-center text-xs font-medium tracking-[0.2em] text-slate-500 uppercase mb-8">
                Trusted by leading protocols
              </p>
              <div className="flex flex-wrap justify-center items-center gap-x-14 gap-y-6">
                {PARTNERS.map((partner) => (
                    <Link
                        key={partner.name}
                        to={partner.url}
                        title={partner.name}
                        className="opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                    >
                      <img src={partner.logo} alt={partner.name} className="h-8 md:h-10 w-auto" />
                    </Link>
                ))}
              </div>
            </div>
          </section>

          {/* ── Problem → Solution ── */}
          <section className="py-20 md:py-28">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">The problem</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
                  Hex addresses weren't designed for humans
                </h2>
                <p className="text-slate-400 text-lg leading-relaxed">
                  Your protocol has dozens of contracts across multiple chains. Users, auditors, and your own team reference them by pasting hex addresses from docs that go stale. One wrong address can mean lost funds.
                </p>
              </div>

              <div className="max-w-4xl mx-auto">
                {/* Before/After comparison */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="rounded-xl border border-red-500/20 bg-red-500/[0.03] p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-red-400" />
                      <span className="text-xs font-medium tracking-wider text-red-400 uppercase">Without Enscribe</span>
                    </div>
                    <div className="space-y-3 font-mono text-xs">
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-red-300/80 overflow-hidden text-ellipsis whitespace-nowrap">
                        0x830BD73E4184ceF73443C15111a1DF14e495C706
                      </div>
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-red-300/80 overflow-hidden text-ellipsis whitespace-nowrap">
                        0xCCcCcCCCcccCBaD6F772a511B337d9CCc9570407
                      </div>
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-red-300/80 overflow-hidden text-ellipsis whitespace-nowrap">
                        0x807DEf5E7d057DF05C796F4bc75C3Fe82Bd6EeE1
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-4">Which contract is which? Are these even legitimate?</p>
                  </div>

                  <div className="rounded-xl border border-cyan-500/20 bg-cyan-500/[0.03] p-6 md:p-8">
                    <div className="flex items-center gap-2 mb-4">
                      <div className="w-2 h-2 rounded-full bg-cyan-400" />
                      <span className="text-xs font-medium tracking-wider text-cyan-400 uppercase">With Enscribe</span>
                    </div>
                    <div className="space-y-3 font-mono text-sm">
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-cyan-300">
                        auction.nouns.eth
                      </div>
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-cyan-300">
                        adapter.phoenix.cork.eth
                      </div>
                      <div className="bg-slate-900/80 rounded-lg px-4 py-3 text-cyan-300">
                        governance.liquity-protocol.eth
                      </div>
                    </div>
                    <p className="text-slate-500 text-xs mt-4">Instantly readable. Verifiable onchain by anyone.</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Features ── */}
          <section id="features" className="py-20 md:py-28 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">Platform</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
                  Everything you need to name your contracts
                </h2>
                <p className="text-slate-400 text-lg">
                  A complete suite of tools for teams who want their protocol identity onchain.
                </p>
              </div>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
                {[
                  {
                    title: "Deploy & name atomically",
                    desc: "Deploy a contract and assign an ENS name in a single transaction. If deployment succeeds, the name is guaranteed.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                        </svg>
                    ),
                  },
                  {
                    title: "Name existing contracts",
                    desc: "Already deployed? Retroactively assign ENS names to your entire contract inventory using your ENS name or ours.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10" />
                        </svg>
                    ),
                  },
                  {
                    title: "Multi-chain support",
                    desc: "Name contracts across Ethereum, Base, Linea, Arbitrum, Optimism, and Scroll from a single dashboard.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9.004 9.004 0 008.716-6.747M12 21a9.004 9.004 0 01-8.716-6.747M12 21c2.485 0 4.5-4.03 4.5-9S14.485 3 12 3m0 18c-2.485 0-4.5-4.03-4.5-9S9.515 3 12 3m0 0a8.997 8.997 0 017.843 4.582M12 3a8.997 8.997 0 00-7.843 4.582m15.686 0A11.953 11.953 0 0112 10.5c-2.998 0-5.74-1.1-7.843-2.918m15.686 0A8.959 8.959 0 0121 12c0 .778-.099 1.533-.284 2.253m0 0A17.919 17.919 0 0112 16.5c-3.162 0-6.133-.815-8.716-2.247m0 0A9.015 9.015 0 013 12c0-1.605.42-3.113 1.157-4.418" />
                        </svg>
                    ),
                  },
                  {
                    title: "Contract inventory",
                    desc: "Never lose track of deployed contracts. View your entire protocol infrastructure, named and organised, across all chains.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" />
                        </svg>
                    ),
                  },
                  {
                    title: "Developer tools",
                    desc: "TypeScript library, Solidity contracts for Foundry, and Hardhat plugin. Integrate ENS naming into your deployment pipeline.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 6.75L22.5 12l-5.25 5.25m-10.5 0L1.5 12l5.25-5.25m7.5-3l-4.5 16.5" />
                        </svg>
                    ),
                  },
                  {
                    title: "Verification status",
                    desc: "Display contract verification status from Etherscan, Blockscout, and Sourcify alongside your ENS names.",
                    icon: (
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75m-3-7.036A11.959 11.959 0 013.598 6 11.99 11.99 0 003 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285z" />
                        </svg>
                    ),
                  },
                ].map((feature, i) => (
                    <div
                        key={i}
                        className="group relative rounded-xl border border-slate-800 bg-slate-900/30 p-6 hover:border-slate-700 hover:bg-slate-900/60 transition-all duration-300"
                    >
                      <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-cyan-500/10 text-cyan-400 mb-4">
                        {feature.icon}
                      </div>
                      <h3 className="text-base font-semibold text-white mb-2">{feature.title}</h3>
                      <p className="text-sm text-slate-400 leading-relaxed">{feature.desc}</p>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── How it works ── */}
          <section className="py-20 md:py-28 border-t border-white/5 bg-gradient-to-b from-transparent via-slate-900/30 to-transparent">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto text-center mb-16">
                <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">How it works</p>
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
                  Three steps to onchain identity
                </h2>
              </div>

              <div className="max-w-4xl mx-auto">
                <div className="grid md:grid-cols-3 gap-8">
                  {[
                    {
                      step: "01",
                      title: "Connect your wallet",
                      desc: "Connect your wallet and bring your own ENS name, or use one from Enscribe to get started immediately.",
                    },
                    {
                      step: "02",
                      title: "Name your contracts",
                      desc: "Deploy new contracts with names atomically, or retroactively name your existing deployed contracts.",
                    },
                    {
                      step: "03",
                      title: "Verify onchain",
                      desc: "Names resolve directly onchain via ENS. Anyone can look up your contracts by name, across chains.",
                    },
                  ].map((item, i) => (
                      <div key={i} className="relative">
                        <div className="text-5xl font-bold text-slate-800/60 mb-4">{item.step}</div>
                        <h3 className="text-lg font-semibold text-white mb-2">{item.title}</h3>
                        <p className="text-sm text-slate-400 leading-relaxed">{item.desc}</p>
                      </div>
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Networks ── */}
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6 text-center">
              <p className="text-xs font-medium tracking-[0.2em] text-slate-500 uppercase mb-8">
                Supported networks
              </p>
              <div className="flex flex-wrap justify-center items-center gap-4">
                {NETWORKS.map((network) => (
                    <div
                        key={network.name}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-slate-800 bg-slate-900/40 text-sm text-slate-400"
                    >
                      <div className="w-2 h-2 rounded-full bg-cyan-400/60" />
                      {network.name}
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Services / Audit CTA ── */}
          <section id="services" className="py-20 md:py-28 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-5xl mx-auto">
                <div className="rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900/80 via-slate-900/60 to-cyan-950/20 overflow-hidden">
                  <div className="grid lg:grid-cols-2 gap-0">
                    {/* Left */}
                    <div className="p-8 md:p-12 flex flex-col justify-center">
                      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 w-fit mb-5">
                        Paid service
                      </div>
                      <h2 className="text-2xl md:text-3xl font-bold text-white mb-4">
                        Contract Naming Audit
                      </h2>
                      <p className="text-slate-400 mb-6 leading-relaxed">
                        For established protocols with complex contract infrastructure. Our team maps out your entire deployment, designs an ENS naming scheme, and helps you roll it out.
                      </p>
                      <div className="flex flex-wrap gap-3">
                        <Link
                            to={customFields.calendarUrl}
                            className="button-primary rounded-lg text-sm"
                        >
                          Book a call
                          <HiArrowRight className="ml-2 w-4 h-4" />
                        </Link>
                        <Link
                            to="/audit"
                            className="inline-flex items-center justify-center px-5 py-3 rounded-lg text-sm font-medium text-slate-400 hover:text-white border border-slate-700 hover:border-slate-600 transition-all"
                        >
                          Learn more
                        </Link>
                      </div>
                    </div>

                    {/* Right - What's included */}
                    <div className="p-8 md:p-12 bg-slate-900/40 border-t lg:border-t-0 lg:border-l border-slate-800">
                      <p className="text-xs font-medium tracking-widest text-slate-500 uppercase mb-6">What's included</p>
                      <ul className="space-y-4">
                        {[
                          "Complete contract & wallet inventory mapping",
                          "Proxy detection (EIP-1967, Beacon, Minimal, custom)",
                          "Admin & ownership structure analysis",
                          "Recommended ENS naming scheme for every contract",
                          "Cross-chain naming strategy",
                          "Rollout plan, blog post & social copy",
                        ].map((item, i) => (
                            <li key={i} className="flex items-start gap-3 text-sm">
                              <svg className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                              </svg>
                              <span className="text-slate-300">{item}</span>
                            </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ── Stats ── */}
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto text-center">
                {[
                  { value: 147, suffix: "+", label: "Contracts named" },
                  { value: 6, suffix: "+", label: "Networks supported" },
                  { value: 3, suffix: "", label: "Developer tools" },
                  { value: 54, suffix: "+", label: "Blog posts & guides" },
                ].map((stat, i) => (
                    <div key={i}>
                      <div className="text-3xl md:text-4xl font-bold text-white mb-1">
                        <AnimatedNumber target={stat.value} suffix={stat.suffix} />
                      </div>
                      <div className="text-sm text-slate-500">{stat.label}</div>
                    </div>
                ))}
              </div>
            </div>
          </section>

          {/* ── Blog carousel ── */}
          <LatestPostsCarousel limit={6} />

          {/* ── FAQ ── */}
          <section id="faq" className="py-20 md:py-28 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-3xl mx-auto">
                <div className="text-center mb-12">
                  <p className="text-sm font-medium tracking-widest text-cyan-400 uppercase mb-3">FAQ</p>
                  <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white">
                    Frequently asked questions
                  </h2>
                </div>
                <div className="rounded-xl border border-slate-800 bg-slate-900/30 px-6 md:px-8">
                  {faqs.map((faq, index) => (
                      <FAQItem key={index} question={faq.question} answer={faq.answer} />
                  ))}
                </div>
              </div>
            </div>
          </section>

          {/* ── Final CTA ── */}
          <section className="py-20 md:py-28 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="flex flex-col items-center text-center max-w-3xl mx-auto">
                <h2 className="text-3xl md:text-4xl font-bold tracking-tight text-white mb-5">
                  Ready to give your protocol a real onchain identity?
                </h2>
                <p className="text-slate-400 text-lg mb-8 max-w-xl">
                  Stop relying on hex addresses and stale documentation. Name your contracts today.
                </p>
                <div className="flex flex-row items-center justify-center gap-4">
                  <Link to={customFields.appUrl} className="button-primary rounded-lg">
                    Launch App
                    <HiArrowRight className="ml-2 w-4 h-4" />
                  </Link>
                  <Link
                      to="/audit"
                      className="inline-flex items-center justify-center px-6 py-3 rounded-lg text-sm font-semibold text-slate-300 border border-slate-700 hover:border-slate-600 hover:text-white transition-all"
                  >
                    Request a naming audit
                  </Link>
                </div>
              </div>
            </div>
          </section>

          {/* ── Newsletter ── */}
          <section className="py-16 border-t border-white/5">
            <div className="container mx-auto px-4 md:px-6">
              <div className="max-w-md mx-auto text-center">
                <p className="text-sm font-medium text-slate-300 mb-4">
                  Stay in the loop on product updates and integrations
                </p>
                <form className="flex gap-2"
                      action="https://web3labs.us17.list-manage.com/subscribe/post" method="POST"
                >
                  <input type="hidden" name="u" value="412696652858d5fc58dd705c9" />
                  <input type="hidden" name="id" value="6dd1b9fa2d" />
                  <input
                      type="email"
                      placeholder="you@protocol.xyz"
                      className="flex-1 px-4 py-2.5 rounded-lg bg-slate-900 border border-slate-800 text-white text-sm placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500/40"
                      name="MERGE0" id="MERGE0"
                  />
                  <button
                      type="submit"
                      className="px-5 py-2.5 rounded-lg bg-cyan-500 text-white text-sm font-semibold hover:bg-cyan-400 transition-colors whitespace-nowrap"
                  >
                    Subscribe
                  </button>
                </form>
              </div>
            </div>
          </section>
        </main>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 py-8">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-2.5">
                <img src="/img/logo.svg" alt="Enscribe" className="h-5 w-5 opacity-60" />
                <span className="text-sm text-slate-500">&copy; {new Date().getFullYear()} Web3 Labs Ltd.</span>
              </div>

              <div className="flex items-center gap-5">
                {[
                  { to: "https://x.com/enscribe_", icon: <FaXTwitter className="h-4 w-4" />, label: "X" },
                  { to: "https://github.com/enscribexyz/enscribe", icon: <FaGithub className="h-4 w-4" />, label: "GitHub" },
                  { to: "https://t.me/enscribers", icon: <FaTelegram className="h-4 w-4" />, label: "Telegram" },
                  { to: "https://discord.gg/8QUMMdS5GY", icon: <FaDiscord className="h-4 w-4" />, label: "Discord" },
                  { to: "https://warpcast.com/enscribe", icon: <SiFarcaster className="h-4 w-4" />, label: "Farcaster" },
                ].map(({ to, icon, label }) => (
                    <Link key={label} to={to} className="text-slate-600 hover:text-slate-400 transition-colors" aria-label={label}>
                      {icon}
                    </Link>
                ))}
              </div>
            </div>
          </div>
        </footer>
      </div>
  )
}
