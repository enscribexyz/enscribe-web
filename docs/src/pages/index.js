import EnscribeLandingPage from "../components/EnscribeLandingPage"
import Head from "@docusaurus/Head"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"

export default function Home() {
  const { siteConfig } = useDocusaurusContext()

  return (
      <>
        <Head>
          <title>{siteConfig.title} — Smart Contract Identity Infrastructure</title>
          <meta name="description" content={siteConfig.tagline} />
          <html className="enscribe-landing-page" />
        </Head>
        <EnscribeLandingPage />
      </>
  )
}
