import dynamic from 'next/dynamic'

const AfterAuthRedirect = dynamic(() => import('./after-auth-redirect'), {
  ssr: false,
  loading: () => (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-muted-foreground text-sm">Redirecting...</div>
    </div>
  ),
})

export default function AfterAuthPage() {
  return <AfterAuthRedirect />
}
