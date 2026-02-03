"use client"

import { useState } from "react"
import Link from "@docusaurus/Link"
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import { FaShieldAlt, FaBolt, FaGlobe, FaStar, FaGithub, FaTelegram, FaDiscord, FaUserAlt, FaLock, FaPlug } from "react-icons/fa"
import { FaXTwitter } from "react-icons/fa6"
import { SiFarcaster } from "react-icons/si";
import { HiArrowDown, HiArrowRight, HiCheck, HiCode, HiChevronDown, HiMenu, HiX } from "react-icons/hi"
import HeroNameIt from "./HeroNameIt";

// FAQ Accordion component
const FAQItem = ({ question, answer }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className="border border-slate-700 rounded-lg mb-4 overflow-hidden">
      <button
        className="w-full flex justify-between items-center p-4 text-left bg-slate-800 hover:bg-slate-700 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <h3 className="text-lg font-medium">{question}</h3>
        <HiChevronDown className={`h-5 w-5 transition-transform ${isOpen ? "transform rotate-180" : ""}`} />
      </button>
      <div className={`overflow-hidden transition-all duration-300 ${isOpen ? "max-h-96 p-4" : "max-h-0"}`}>
        <div className="text-slate-300">{answer}</div>
      </div>
    </div>
  )
}

export default function EnscribeLandingPage() {
  const {
    siteConfig: {customFields},
  } = useDocusaurusContext();

  const [menuOpen, setMenuOpen] = useState(false);

  const PARTNERS = [
    { name: 'Nouns DAO', logo: 'img/projects/nouns.svg', url: '/blog/nouns' }, // Nouns recently rolled out Enscribe names
    { name: 'Liquity', logo: 'img/projects/liquity.png', url: '/blog/liquity' }, // Liquity V2 integration
    { name: 'Cork Protocol', logo: 'img/projects/cork.svg', url: '/blog/cork' }, // Cork uses UniV4 hooks
    { name: 'Giveth', logo: 'img/projects/giveth-tq.svg', url: '/blog/giveth', invertInDark: true, scale: 1.2 },
  ];

  const faqs = [
    {
      question: "Which protocols are already using Enscribe?",
      answer: (
          <>
            Major ecosystem players like <strong>Nouns DAO</strong> have integrated Enscribe to name their entire contract ecosystem.
            We also support leading DeFi protocols like <strong>Liquity</strong> and <strong>Cork Protocol</strong> to ensure their users always know exactly which immutable contracts they are interacting with.
          </>
      ),
    },
    {
      question: "Why should I use Enscribe?",
      answer:
        "Ethereum has a thriving DApp ecosystem, but developers and users still rely on smart contract addresses to address contracts. ENS names can be used to name smart contracts, but few take advantage of this functionality. The Enscribe service changes this and enables developers to name their smart contracts at deploy time with no additional coding.",
    },
    {
      question: "What networks do you support?",
      answer: "We support all networks that ENS is deployed to, including Ethereum, Base and Linea",
    },
    {
      question: "Can I name existing contracts?",
      answer: "Yes. If you already have deployed contracts, you can assign ENS names through Enscribe using your own ENS names or one of ours."
    },
    {
      question: "Can Enscribe show if a contract is verified?",
      answer: "Yes. We pull verification data from services like Etherscan, Blockscout, and Sourcify so you and your users can see verification status at a glance."
    },
    {
      question: "How does Enscribe work?",
      answer:
        "When you deploy a contract using Enscribe it creates a new ENS subname you specify that resolves to the address of the newly deployed contract. Enscribe does this as an atomic transaction, so if contract deployment succeeds you will always have an ENS name you can refer to the contract with.",
    },
    {
      question: "Are there any restrictions on the types of contracts you support?",
      answer: (
        <>
          Enscribe caters for contracts that implement{" "}
          <a href="https://eips.ethereum.org/EIPS/eip-173" className="text-cyan-400 hover:underline">
            ERC-173: Contract Ownership Standard
          </a>{" "}
          or the{" "}
          <a
            href="https://docs.openzeppelin.com/contracts/2.x/access-control#ownership-and-ownable"
            className="text-cyan-400 hover:underline"
          >
            Ownable interface
          </a>
          . However, you can use the service to issue names for already deployed contracts.
        </>
      ),
    },
    {
      question: "What are the risks with the service?",
      answer:
        "Whilst every effort has been made to ensure that our contracts cannot be exploited, we have yet to have them formally audited whilst we're in beta. The Enscribe service does require an ENS 2LD or subname with manager authority, but as long as you retain the Owner privilege, you can always delete subnames issued by the service.",
    },
    {
      question: "What happens if my domain expires?",
      answer:
        "Just like with domain names, if your ENS name lapses and someone else takes ownership of it the subnames issued by Enscribe are no longer valid.",
    },
    {
      question: "Could it steal my ENS names?",
      answer:
        "No! Enscribe uses the manager role for an ENS name, you retain full ownership of the ENS name and can choose to override or delete any actions performed by the service.",
    },
  ]

  return (
    <div className="enscribe-landing bg-slate-900 text-white font-sans min-h-screen">
      {/* Custom Header for Landing Page */}
      <header className="sticky top-0 z-50 w-full border-b border-slate-700 bg-slate-900/95 backdrop-blur">
        <div className="container mx-auto px-4 md:px-6 flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <HiCode className="h-8 w-8 text-cyan-400" />
            <span className="text-2xl font-bold">Enscribe</span>
          </div>
          <nav className="hidden md:flex gap-6">
            <Link to="#features" className="text-sm font-medium transition-colors hover:text-cyan-400">
              Features
            </Link>
            <Link to="#how-it-works" className="text-sm font-medium transition-colors hover:text-cyan-400">
              How It Works
            </Link>
            <Link to="#faq" className="text-sm font-medium transition-colors hover:text-cyan-400">
              FAQ
            </Link>
            <Link to="/docs" className="text-sm font-medium transition-colors hover:text-cyan-400">
              Docs
            </Link>
            <Link to="/guides" className="text-sm font-medium transition-colors hover:text-cyan-400">
              Guides
            </Link>
            <Link to="/blog" className="text-sm font-medium transition-colors hover:text-cyan-400">
              Blog
            </Link>
            <Link to="/audit" className="text-sm font-medium transition-colors hover:text-cyan-400">
              Services
            </Link>
          </nav>
          <Link to={customFields.appUrl} className="hidden md:flex button-primary rounded-md">
            Launch App
          </Link>
          <div className="md:hidden flex items-center">
            <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="text-slate-300 hover:text-white focus:outline-none"
            >
              {menuOpen ? <HiX className="h-6 w-6"/> : <HiMenu className="h-6 w-6"/>}
            </button>
          </div>
          {menuOpen && (
              <div className="absolute top-16 left-0 w-full bg-slate-900 border-t border-slate-700 px-6 py-4 space-y-4 shadow-lg z-50 md:hidden">
                <Link to="#features"
                      className="block text-white text-lg font-medium hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>Features</Link>
                <Link to="#how-it-works"
                      className="block text-white text-lg font-medium hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>How It Works</Link>
                <Link to="#faq" className="block text-white text-lg font-medium hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>FAQ</Link>
                <Link to="/docs"
                      className="block text-white text-lg font-bold hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>Docs</Link>
                <Link to="/guides"
                      className="block text-white text-lg font-bold hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>Guides</Link>
                <Link to="/blog"
                      className="block text-white text-lg font-bold hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>Blog</Link>
                <Link to="/audit"
                      className="block text-white text-lg font-bold hover:text-cyan-400"
                      onClick={() => setMenuOpen(false)}>Services</Link>
              </div>
          )}
        </div>
      </header>

      <main className="flex-1">
        {/* === ENS Contract Naming Season Banner === */}
        <div
            className="contract-season-banner w-full bg-gradient-to-r from-indigo-500 via-purple-600 to-fuchsia-500 text-white text-center py-3 px-4 font-semibold shadow-md">
          🌟 <span
            className="font-bold">ENS Contract Naming Season is Live! 10,000 $ENS in rewards.</span>
          <a
              href="/blog/contract-naming-season"
              className="ml-2 font-normal opacity-90 hover:opacity-100 hover:underline transition"
          >
            Learn more →
          </a>
        </div>

        {/* === ENS Contract Audit Service Banner === */}
        <div
            className="w-full bg-slate-900 border-b border-slate-800 py-2 px-4 text-center text-sm">
  <span className="text-slate-300">
    🔍 <span className="font-medium text-white">New:</span> Smart Contract Naming Audits for Project Teams —
    our bespoke naming service.
  </span>
          <a
              href="/audit"
              className="text-cyan-400 font-medium ml-2 hover:underline"
          >
            Learn More →
          </a>
        </div>

        {/* Hero Section */}
        <section className="relative py-6 overflow-hidden">
          <div className="container mx-auto px-4 md:px-6 relative z-10">
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="flex-1">
                <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-6">
                  Give Your Smart Contracts a Name — and a Reputation
                </h1>
                <p className="text-slate-300 text-xl max-w-[600px] mb-8">
                  With Enscribe, developers can easily assign ENS names to smart contracts, while
                  providing verification data to increase user trust.
                </p>
                <div className="flex flex-wrap gap-4">
                  <Link to={customFields.appUrl} className="button-primary rounded-md">
                    Launch App
                  </Link>
                  <Link
                      to="/docs"
                      className="inline-flex items-center justify-center px-6 py-3 rounded-md bg-slate-800 border border-cyan-500 text-cyan-400 font-bold hover:bg-slate-700 transition-colors gap-2"
                  >
                    Documentation
                    <HiArrowRight className="w-4 h-4"/>
                  </Link>
                </div>
              </div>
              <div className="flex-1 flex justify-center">
                <HeroNameIt/>
              </div>
            </div>
          </div>
          <div
              className="absolute inset-0 bg-[url('/img/grid.svg')] bg-center [mask-image:linear-gradient(180deg,white,rgba(255,255,255,0))]"></div>
        </section>

        {/* Partners Section */}
        <section className="py-8 bg-slate-900/50 border-y border-slate-800">
          <div className="container mx-auto px-4">
            <p className="text-center text-slate-400 text-sm font-medium uppercase tracking-wider mb-8">
              Trusted by leading projects
            </p>
            {/* 1. Remove the hover classes from this parent div */}
            <div className="flex flex-wrap justify-center items-center gap-12">
            {PARTNERS.map((partner) => (
                  <Link
                      key={partner.name}
                      to={partner.url}
                      title={partner.name}
                      className="opacity-60 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-300"
                  >
                    <span className="text-xl font-bold text-slate-300">
            <img src={partner.logo} alt={partner.name} className="h-8 md:h-10 w-auto"/>
          </span>
                  </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="py-12 md:py-16">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-center bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-12">
              Key Features
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaShieldAlt/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Enhanced Trust</h3>
                <p className="text-slate-300">
                  Associate human-readable ENS names with smart contracts, boosting user confidence
                  and transparency.
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaBolt/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Automatic ENS Integration</h3>
                <p className="text-slate-300">
                  Seamlessly create ENS records for smart contracts at deployment, or for existing
                  contracts, eliminating manual steps.
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaGlobe/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Multi-chain Support</h3>
                <p className="text-slate-300">
                  Name contracts on multiple ENS-supported chains including Ethereum, Base and
                  Linea.
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaUserAlt/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Bring Your Own Name</h3>
                <p className="text-slate-300">
                  Enscribe supports using your own ENS name or you can use one of our own.
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaLock/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Track and Manager Your Contracts</h3>
                <p className="text-slate-300">
                  Track your existing contracts in the Enscribe dashboard to easily find, name and
                  verify your contracts.
                </p>
              </div>
              <div className="bg-slate-800 border border-slate-700 rounded-lg p-8">
                <div className="text-cyan-400 text-3xl mb-4">
                  <FaPlug/>
                </div>
                <h3 className="text-xl font-semibold mb-4">Smart Contract Verifications</h3>
                <p className="text-slate-300">
                  View and display verification status of contracts accross a number of sources
                  including Etherscan, Blockscout, and Sourcify.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Section */}
        <section id="how-it-works" className="py-12 md:py-24 lg:py-32 bg-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-center bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-12">
              How It Works
            </h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-cyan-400">Input</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <HiCheck className="mr-2 h-4 w-4 text-cyan-400"/>
                      <span className="text-slate-200">ENS subname for contract deployment</span>
                    </li>
                    <li className="flex items-center">
                      <HiCheck className="mr-2 h-4 w-4 text-cyan-400"/>
                      <span className="text-slate-200">Contract bytecode to be deployed or existing contract address</span>
                    </li>
                  </ul>
                </div>
                <div className="space-y-4">
                  <h3 className="text-xl font-bold text-cyan-400">Output</h3>
                  <ul className="space-y-2">
                    <li className="flex items-center">
                      <HiCheck className="mr-2 h-4 w-4 text-cyan-400"/>
                      <span className="text-slate-200">ENS primary name that resolves to contract address</span>
                    </li>
                    <li className="flex items-center">
                      <HiCheck className="mr-2 h-4 w-4 text-cyan-400"/>
                      <span
                          className="text-slate-200">Optional verifications for additional trust</span>
                    </li>
                  </ul>
                </div>
              </div>
              <div className="bg-slate-900 p-6 rounded-xl border border-slate-700 shadow-lg">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Complex Contract Address</div>
                    <div className="bg-slate-950 p-3 rounded-md font-mono text-sm overflow-x-auto">
                      <span
                          className="text-red-400">0x830BD73E4184ceF73443C15111a1DF14e495C706</span>
                    </div>
                  </div>
                  <div className="flex justify-center">
                    <div className="bg-cyan-500/10 rounded-full p-2">
                      <HiArrowDown className="h-8 w-8 text-cyan-400"/>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="text-sm text-slate-400">Human-Readable ENS Name</div>
                    <div className="bg-slate-950 p-3 rounded-md font-mono text-sm">
                      <span className="text-cyan-400">auction.nouns.eth</span>
                    </div>
                  </div>
                  <div className="mt-4 text-center text-sm text-slate-400">
                    Enscribe automatically creates and links ENS names to your smart contracts,
                    making them more
                    accessible and trustworthy for users.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* FAQ Section */}
        <section id="faq" className="py-12 md:py-24 lg:py-32">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-center bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-12">
              Frequently Asked Questions
            </h2>
            <div className="max-w-3xl mx-auto">
              {faqs.map((faq, index) => (
                  <FAQItem key={index} question={faq.question} answer={faq.answer}/>
              ))}
            </div>
          </div>
        </section>

        {/* Testimonials Section 
        <section id="testimonials" className="py-12 md:py-24 lg:py-32 bg-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <h2 className="text-3xl font-bold tracking-tight md:text-4xl text-center bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-12">
              What Our Users Say
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
                <div className="flex gap-1 text-cyan-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className="fill-cyan-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6">
                  "Enscribe has transformed how we deploy smart contracts. The automatic ENS integration is a
                  game-changer for transparency and user trust."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-medium">
                    AK
                  </div>
                  <div>
                    <p className="font-medium">Alex Kim</p>
                    <p className="text-xs text-slate-400">CTO, DeFi Innovations</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
                <div className="flex gap-1 text-cyan-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className="fill-cyan-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6">
                  "The multi-chain support in Enscribe has allowed us to expand our dApp across multiple networks
                  seamlessly. It's an essential tool for modern web3 development."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-medium">
                    SL
                  </div>
                  <div>
                    <p className="font-medium">Sarah Lee</p>
                    <p className="text-xs text-slate-400">Lead Developer, ChainBridge Solutions</p>
                  </div>
                </div>
              </div>
              <div className="bg-slate-900 border border-slate-700 rounded-lg p-8">
                <div className="flex gap-1 text-cyan-400 mb-6">
                  {[...Array(5)].map((_, i) => (
                    <FaStar key={i} className="fill-cyan-400" />
                  ))}
                </div>
                <p className="text-slate-300 mb-6">
                  "As a small team, Enscribe has been invaluable. It's simplified our deployment process and added a
                  layer of professionalism to our contracts that our users appreciate."
                </p>
                <div className="flex items-center gap-4">
                  <div className="h-10 w-10 rounded-full bg-cyan-500 flex items-center justify-center text-slate-900 font-medium">
                    MR
                  </div>
                  <div>
                    <p className="font-medium">Mike Rodriguez</p>
                    <p className="text-xs text-slate-400">Founder, NFT Marketplace X</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
*/}
        {/* CTA Section */}
        <section id="get-started" className="py-12 md:py-24 lg:py-32 bg-slate-800">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center max-w-3xl mx-auto">
              <h2 className="text-3xl font-bold tracking-tight md:text-4xl bg-gradient-to-r from-white to-cyan-400 bg-clip-text text-transparent mb-4">
                ENS names are only the beginning — start building trust into every contract
                interaction
              </h2>
              <p className="text-slate-300 text-xl mb-8 max-w-[600px]">
                Join the growing community of developers using Enscribe to name their smart
                contracts, enhancing trust and transparency in their web3 apps.
              </p>
              <Link to={customFields.appUrl} className="button-primary rounded-md">
                Launch App
              </Link>
            </div>
          </div>
        </section>
        {/* Mailing List Section */}
        <section className="py-12 md:py-24">
          <div className="container mx-auto px-4 md:px-6">
            <div className="flex flex-col items-center space-y-4 text-center max-w-3xl mx-auto">
              <h2 className="text-2xl font-bold tracking-tight md:text-3xl text-white mb-4">
                Join the growing community of developers using Enscribe to name their smart
                contracts
              </h2>
              <form className="w-full max-w-md flex flex-col sm:flex-row gap-3"
                    action="https://web3labs.us17.list-manage.com/subscribe/post" method="POST"
              >
                <input type="hidden" name="u" value="412696652858d5fc58dd705c9"/>
                <input type="hidden" name="id" value="6dd1b9fa2d"/>

                <input
                    type="email"
                    placeholder="Enter your email"
                    className="flex-1 px-4 py-3 rounded-md bg-slate-900 border border-slate-700 text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500"
                    name="MERGE0" id="MERGE0"
                />
                <button
                    type="submit"
                    className="px-6 py-3 rounded-md bg-cyan-500 text-white font-bold hover:bg-cyan-600 transition-colors whitespace-nowrap"
                >
                  Subscribe
                </button>
              </form>
            </div>
          </div>
        </section>
      </main>

      {/* Custom Footer for Landing Page */}
      <footer className="py-6 md:py-0 border-t border-slate-700 bg-slate-800">
        <div className="container mx-auto px-4 md:px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4 md:h-24">
            <div className="flex items-center gap-2">
              <HiCode className="h-6 w-6 text-cyan-400"/>
              <span className="text-lg font-bold">Enscribe</span>
            </div>
            <p className="text-center md:text-left text-sm text-slate-400">© {new Date().getFullYear()} Web3
              Labs Ltd. All rights reserved.</p>
            <div className="flex items-center gap-4">
              <Link to="https://x.com/enscribe_"
                    className="text-slate-400 hover:text-cyan-400 transition-colors">
              <FaXTwitter className="h-5 w-5" />
                <span className="sr-only">X (formerly Twitter)</span>
              </Link>
              <Link to="https://github.com/enscribexyz/enscribe" className="text-slate-400 hover:text-cyan-400 transition-colors">
                <FaGithub className="h-5 w-5" />
                <span className="sr-only">GitHub</span>
              </Link>
              <Link to="https://t.me/enscribers" className="text-slate-400 hover:text-cyan-400 transition-colors">
                <FaTelegram className="h-5 w-5" />
                <span className="sr-only">Telegram</span>
              </Link>
              <Link to="https://discord.gg/8QUMMdS5GY" className="text-slate-400 hover:text-cyan-400 transition-colors">
                <FaDiscord className="h-5 w-5" />
                <span className="sr-only">Discord</span>
              </Link>
              <Link to="https://warpcast.com/enscribe" className="text-slate-400 hover:text-cyan-400 transition-colors">
                <SiFarcaster className="h-5 w-5" />
                <span className="sr-only">Farcaster</span>
              </Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}


