import type { Metadata } from 'next'
import { GeistSans } from 'geist/font/sans'
import { GeistMono } from 'geist/font/mono'
import { ClerkProvider } from '@clerk/nextjs'
import { Toaster } from 'sonner'
import './globals.css'

export const metadata: Metadata = {
  title: 'Enscribe | Smart Contract Identity',
  description:
    'The identity layer for smart contracts. Manage your ENS namespace across all your deployments.',
}

const clerkAppearance = {
  variables: {
    colorPrimary: 'hsl(221, 83%, 53%)',
    colorBackground: 'hsl(0, 0%, 7%)',
    colorInputBackground: 'hsl(0, 0%, 10%)',
    colorInputText: 'hsl(0, 0%, 98%)',
    colorText: 'hsl(0, 0%, 98%)',
    colorTextSecondary: 'hsl(0, 0%, 63%)',
    colorNeutral: 'hsl(0, 0%, 98%)',
    colorTextOnPrimaryBackground: 'hsl(0, 0%, 98%)',
    borderRadius: '0.5rem',
  },
  elements: {
    // Global dark overrides for all Clerk components
    card: 'bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] shadow-2xl text-[hsl(0,0%,98%)]',
    headerTitle: 'text-[hsl(0,0%,98%)]',
    headerSubtitle: 'text-[hsl(0,0%,63%)]',
    socialButtonsBlockButton:
      'bg-[hsl(0,0%,10%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    socialButtonsBlockButtonText: 'text-[hsl(0,0%,98%)]',
    dividerLine: 'bg-[hsl(0,0%,15%)]',
    dividerText: 'text-[hsl(0,0%,63%)]',
    formFieldLabel: 'text-[hsl(0,0%,98%)]',
    formFieldInput:
      'bg-[hsl(0,0%,10%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,98%)] placeholder:text-[hsl(0,0%,40%)]',
    formButtonPrimary: 'bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,45%)]',
    footerActionLink: 'text-[hsl(221,83%,53%)] hover:text-[hsl(221,83%,60%)]',
    footerActionText: 'text-[hsl(0,0%,63%)]',
    identityPreview: 'bg-[hsl(0,0%,10%)] border-[hsl(0,0%,15%)]',
    identityPreviewText: 'text-[hsl(0,0%,98%)]',
    identityPreviewEditButton: 'text-[hsl(221,83%,53%)]',
    userButtonPopoverCard:
      'bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] shadow-2xl',
    userButtonPopoverActionButton:
      'text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    userButtonPopoverActionButtonText: 'text-[hsl(0,0%,98%)]',
    userButtonPopoverActionButtonIcon: 'text-[hsl(0,0%,63%)]',
    userButtonPopoverFooter: 'hidden',
    organizationSwitcherPopoverCard:
      'bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] shadow-2xl',
    organizationSwitcherPopoverActionButton:
      'text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    organizationSwitcherPopoverActionButtonText: 'text-[hsl(0,0%,98%)]',
    organizationSwitcherPopoverActionButtonIcon: 'text-[hsl(0,0%,63%)]',
    organizationPreviewMainIdentifier: 'text-[hsl(0,0%,98%)]',
    organizationPreviewSecondaryIdentifier: 'text-[hsl(0,0%,63%)]',
    membersPageInviteButton: 'bg-[hsl(221,83%,53%)] hover:bg-[hsl(221,83%,45%)]',
    profileSectionTitle: 'text-[hsl(0,0%,98%)] border-b-[hsl(0,0%,15%)]',
    profileSectionTitleText: 'text-[hsl(0,0%,98%)]',
    profileSectionContent: 'text-[hsl(0,0%,98%)]',
    profileSectionPrimaryButton: 'text-[hsl(221,83%,53%)]',
    navbarButton: 'text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    navbarButtonIcon: 'text-[hsl(0,0%,63%)]',
    breadcrumbs: 'text-[hsl(0,0%,63%)]',
    breadcrumbsItem: 'text-[hsl(0,0%,63%)]',
    breadcrumbsItemDivider: 'text-[hsl(0,0%,25%)]',
    pageScrollBox: 'bg-[hsl(0,0%,7%)]',
    page: 'text-[hsl(0,0%,98%)]',
    tableHead: 'text-[hsl(0,0%,63%)]',
    tableBody: 'text-[hsl(0,0%,98%)]',
    badge: 'bg-[hsl(0,0%,13%)] text-[hsl(0,0%,63%)] border-[hsl(0,0%,20%)]',
    tagInputContainer:
      'bg-[hsl(0,0%,10%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,98%)]',
    modalContent:
      'bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] text-[hsl(0,0%,98%)]',
    modalBackdrop: 'bg-black/60',
    selectButton:
      'bg-[hsl(0,0%,10%)] border-[hsl(0,0%,15%)] text-[hsl(0,0%,98%)]',
    selectOptionsContainer:
      'bg-[hsl(0,0%,7%)] border-[hsl(0,0%,15%)]',
    selectOption:
      'text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    menuButton: 'text-[hsl(0,0%,63%)] hover:bg-[hsl(0,0%,13%)]',
    menuList:
      'bg-[hsl(0,0%,7%)] border border-[hsl(0,0%,15%)] shadow-2xl',
    menuItem: 'text-[hsl(0,0%,98%)] hover:bg-[hsl(0,0%,13%)]',
    avatarImageActionsUpload: 'text-[hsl(221,83%,53%)]',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const content = (
    <html
      lang="en"
      className={`dark ${GeistSans.variable} ${GeistMono.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-screen font-sans antialiased">
        {children}
        <Toaster
          theme="dark"
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'hsl(0, 0%, 7%)',
              border: '1px solid hsl(0, 0%, 15%)',
              color: 'hsl(0, 0%, 98%)',
            },
          }}
        />
      </body>
    </html>
  )

  if (!process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY) {
    return content
  }

  return (
    <ClerkProvider
      appearance={clerkAppearance}
      signInUrl="/sign-in"
      signUpUrl="/sign-up"
      afterSignOutUrl="/home"
    >
      {content}
    </ClerkProvider>
  )
}
