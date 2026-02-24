import React, { useEffect, useRef, useState } from 'react'
import Layout from '@theme/Layout'
import BrowserOnly from '@docusaurus/BrowserOnly'
import useBaseUrl from '@docusaurus/useBaseUrl'

declare global {
  interface Window {
    Scalar?: {
      createApiReference: (
        element: HTMLElement,
        configuration: Record<string, unknown>,
      ) => void
    }
  }
}

const SCALAR_STANDALONE_URL = 'https://cdn.jsdelivr.net/npm/@scalar/api-reference'

const loadScalarScript = () =>
  new Promise<void>((resolve, reject) => {
    if (window.Scalar) {
      resolve()
      return
    }

    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-scalar-standalone]',
    )

    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true })
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Scalar script')),
        { once: true },
      )
      return
    }

    const script = document.createElement('script')
    script.src = SCALAR_STANDALONE_URL
    script.async = true
    script.dataset.scalarStandalone = 'true'
    script.addEventListener('load', () => resolve(), { once: true })
    script.addEventListener(
      'error',
      () => reject(new Error('Failed to load Scalar script')),
      { once: true },
    )
    document.body.appendChild(script)
  })

function ApiReferenceContent() {
  const rootRef = useRef<HTMLDivElement>(null)
  const [loadError, setLoadError] = useState<string>('')
  const openApiSpecUrl = useBaseUrl('/openapi/enscribe.json')

  useEffect(() => {
    let isMounted = true

    const mountReference = async () => {
      try {
        await loadScalarScript()
        if (!isMounted || !rootRef.current || !window.Scalar) return

        rootRef.current.innerHTML = ''
        window.Scalar.createApiReference(rootRef.current, {
          url: openApiSpecUrl,
          layout: 'modern',
          showSidebar: true,
          hideDarkModeToggle: true,
          showDeveloperTools: 'never',
          hideDownloadButton: true,
        })
      } catch {
        if (!isMounted) return
        setLoadError('Failed to load API reference. Please refresh the page.')
      }
    }

    mountReference()

    return () => {
      isMounted = false
    }
  }, [openApiSpecUrl])

  return (
    <div className="api-reference-root">
      {loadError ? (
        <div className="container margin-top--lg">
          <p>{loadError}</p>
        </div>
      ) : null}
      <div ref={rootRef} />
    </div>
  )
}

export default function ApiReferencePage() {
  return (
    <Layout title="API reference" description="Enscribe API reference">
      <BrowserOnly>{() => <ApiReferenceContent />}</BrowserOnly>
    </Layout>
  )
}
