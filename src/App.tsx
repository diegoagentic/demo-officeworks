import { useState, useEffect } from 'react'
import { GenUIProvider } from './context/GenUIContext'
import { useAuth } from './context/AuthContext'
import { useDemo } from './context/DemoContext'
import { useDemoProfile } from './context/useDemoProfile'
import Login from "./Login"
import Navbar from "./components/Navbar"
import DemoGuide from "./components/DemoGuide"
import SessionExpiryModal from "./components/SessionExpiryModal"
import DemoSidebar from "./components/demo/DemoSidebar"
import DemoSpotlight from "./components/demo/DemoSpotlight"
import DemoProcessPanel from "./components/demo/DemoProcessPanel"
import DemoStepBanner from "./components/demo/DemoStepBanner"
import DemoAIIndicator from "./components/demo/DemoAIIndicator"
import StrataArchitectureSlide from "./components/demo/StrataArchitectureSlide"

import OfficeworksPage, { OfficeworksDashboardPage } from "./components/officeworks/OfficeworksPage"
import { LayoutDashboard as LayoutDashboardIcon, Inbox as InboxIcon, Pencil as PencilIcon, ClipboardCheck as ClipboardCheckIcon, Send as SendIcon } from 'lucide-react'

import logoLightBrand from './assets/logo-light-brand.png'
import logoDarkBrand from './assets/logo-dark-brand.png'

function App() {
  const { user, initialLoading, signOut, showSessionWarning, refreshSession } = useAuth()
  const { isDemoActive, currentStep, isSidebarCollapsed, steps, goToStep } = useDemo()
  const { activeProfile: demoProfile } = useDemoProfile()
  const [isDemoGuideOpen, setIsDemoGuideOpen] = useState(false)
  const [showArchSlide, setShowArchSlide] = useState(false)
  const [officeworksDashboardActive, setOfficeworksDashboardActive] = useState(false)

  // Reset Officeworks dashboard mode when any demo step advances
  useEffect(() => {
    if (officeworksDashboardActive) setOfficeworksDashboardActive(false)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep?.id])

  const handleNavigate = (page: string) => {
    if (page === 'officeworks-dashboard') {
      setOfficeworksDashboardActive(true)
    } else if (page.startsWith('officeworks-')) {
      setOfficeworksDashboardActive(false)
      const idx = steps.findIndex(s => s.app === page)
      if (idx >= 0) goToStep(idx)
    }
  }

  const handleLogout = async () => {
    await signOut()
  }

  if (initialLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <img src={logoLightBrand} alt="Strata" className="h-16 w-auto block dark:hidden" />
          <img src={logoDarkBrand} alt="Strata" className="h-16 w-auto hidden dark:block" />
          <svg className="animate-spin h-8 w-8 text-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <p className="text-muted-foreground text-sm">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return <Login />
  }

  // Officeworks-only demo · profile is hardcoded to Officeworks in DemoProfileContext.
  const officeworksAppName =
      currentStep?.app === 'officeworks-intake' ? 'Intake AI'
    : currentStep?.app === 'officeworks-design' ? 'Design AI'
    : currentStep?.app === 'officeworks-spec-check' ? 'Spec Check AI'
    : currentStep?.app === 'officeworks-submission' ? 'Submission AI'
    : currentStep?.app === 'officeworks-dashboard' ? 'Design Dashboard'
    : currentStep?.app === 'officeworks-labor' ? 'Labor AI'
    : currentStep?.app === 'officeworks-sales' ? 'Sales AI'
    : 'Spec Check AI'

  const officeworksNav = [
    { name: 'Dashboard',     page: 'officeworks-dashboard',  icon: LayoutDashboardIcon },
    { name: 'Intake AI',     page: 'officeworks-intake',     icon: InboxIcon },
    { name: 'Design AI',     page: 'officeworks-design',     icon: PencilIcon },
    { name: 'Spec Check AI', page: 'officeworks-spec-check', icon: ClipboardCheckIcon },
    { name: 'Submission AI', page: 'officeworks-submission', icon: SendIcon },
  ]

  const appToTab: Record<string, string> = {
    'officeworks-dashboard':   'officeworks-dashboard',
    'officeworks-intake':      'officeworks-intake',
    'officeworks-design':      'officeworks-design',
    'officeworks-spec-check':  'officeworks-spec-check',
    'officeworks-submission':  'officeworks-submission',
    'officeworks-labor':       'officeworks-labor',
    'officeworks-sales':       'officeworks-sales',
  }
  const activeTab = !isDemoActive
    ? 'officeworks-dashboard'
    : (officeworksDashboardActive ? 'officeworks-dashboard' : (appToTab[currentStep?.app ?? ''] ?? 'officeworks-dashboard'))

  return (
    <GenUIProvider onNavigate={handleNavigate}>
      <SessionExpiryModal
        isOpen={showSessionWarning}
        onExtend={refreshSession}
        onLogout={handleLogout}
      />

      <DemoSidebar />
      <DemoSpotlight />
      <DemoProcessPanel onNavigate={handleNavigate} />
      <DemoStepBanner />

      <div className="fixed top-0 left-0 right-0 z-[100]">
        <Navbar
          onLogout={handleLogout}
          onNavigateToWorkspace={() => {}}
          onOpenDemoGuide={() => setIsDemoGuideOpen(true)}
          activeTab={activeTab}
          onNavigate={handleNavigate}
          appName={isDemoActive ? officeworksAppName : 'Strata AI'}
          companyName={demoProfile.companyName}
          customNavigation={officeworksNav}
        />
      </div>

      <main className={`transition-all duration-300 pt-16 ${isDemoActive ? (isSidebarCollapsed ? 'pl-0' : 'pl-80') + ' animate-in fade-in duration-500' : ''} min-h-screen bg-background`}>
        {isDemoActive && <DemoAIIndicator />}
        {officeworksDashboardActive ? <OfficeworksDashboardPage /> : <OfficeworksPage />}
      </main>

      <DemoGuide
        isOpen={isDemoGuideOpen}
        onClose={() => setIsDemoGuideOpen(false)}
        onNavigate={handleNavigate}
      />

      <StrataArchitectureSlide open={showArchSlide} onClose={() => setShowArchSlide(false)} />
    </GenUIProvider>
  )
}

export default App
