import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp
        routing="hash"
        afterSignUpUrl="/after-auth"
        appearance={{
          variables: {
            colorPrimary: 'hsl(243, 75%, 59%)',
            colorBackground: 'hsl(224, 22%, 12%)',
            colorText: 'hsl(220, 14%, 92%)',
            colorInputBackground: 'hsl(224, 18%, 18%)',
            colorInputText: 'hsl(220, 14%, 92%)',
          },
        }}
      />
    </div>
  )
}
