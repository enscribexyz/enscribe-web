import EnscribeLandingPage from "../components/EnscribeLandingPage"
import Head from "@docusaurus/Head"
import useDocusaurusContext from "@docusaurus/useDocusaurusContext"

export default function Home() {
  const { siteConfig } = useDocusaurusContext()

  return (
      <>
        <Head>
          <title>{siteConfig.title} | Team-Based Identity Infrastructure for Protocols</title>
          <meta name="description" content={siteConfig.tagline} />
          <html className="enscribe-landing-page" />
        </Head>
        <EnscribeLandingPage />
      </>
  )
}
