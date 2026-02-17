import { SignUp } from '@clerk/nextjs'

export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
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
