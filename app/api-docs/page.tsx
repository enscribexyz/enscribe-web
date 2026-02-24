import Script from 'next/script'

const scalarConfiguration = {
  theme: 'alternate',
  layout: 'modern',
  showSidebar: true,
  hideDownloadButton: false,
  darkMode: false,
}

export const metadata = {
  title: 'Enscribe API Docs',
}

export default function ApiDocsPage() {
  return (
    <main>
      <script
        id="api-reference"
        data-url="/api/openapi"
        data-configuration={JSON.stringify(scalarConfiguration)}
      />
      <Script
        src="https://cdn.jsdelivr.net/npm/@scalar/api-reference"
        strategy="afterInteractive"
      />
    </main>
  )
}
