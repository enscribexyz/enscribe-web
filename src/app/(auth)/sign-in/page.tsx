import { SignIn } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn
        routing="hash"
        forceRedirectUrl="/after-auth"
        appearance={{
          elements: {
            rootBox: 'mx-auto',
            card: 'bg-card border border-border shadow-2xl',
          },
        }}
      />
    </div>
  )
}
