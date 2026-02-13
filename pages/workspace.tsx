import React from 'react'
import Link from 'next/link'
import { useAccount } from 'wagmi'
import Layout from '@/components/Layout'
import { CONTRACTS } from '@/utils/constants'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  BriefcaseBusiness,
  Building2,
  Layers,
  Link2,
  ShieldCheck,
  Sparkles,
  Wallet,
  Zap,
} from 'lucide-react'

type PlanTier = 'free' | 'pro' | 'enterprise'
type Environment = 'production' | 'staging' | 'development'
type TransactionStatus = 'queued' | 'simulated' | 'submitted' | 'confirmed'
type DelegationStatus = 'queued' | 'active'
type ContractStatus = 'unnamed' | 'pending' | 'named'
type ActionType = 'delegate_manager' | 'import_contract' | 'assign_contract_name'

type Org = {
  id: string
  name: string
  plan: PlanTier
  createdAt: string
}

type Project = {
  id: string
  orgId: string
  name: string
  chainId: number
  environment: Environment
  createdAt: string
}

type ContractIdentity = {
  id: string
  orgId: string
  projectId: string
  address: string
  chainId: number
  environment: Environment
  ensName?: string
  status: ContractStatus
  createdAt: string
}

type Delegation = {
  id: string
  orgId: string
  parentName: string
  managerAddress: string
  status: DelegationStatus
  createdAt: string
}

type Action = {
  id: string
  orgId: string
  type: ActionType
  title: string
  description: string
  status: TransactionStatus
  resourceId?: string
  chainId?: number
  createdAt: string
  completedAt?: string
}

type WorkspaceState = {
  orgs: Org[]
  projects: Project[]
  contracts: ContractIdentity[]
  delegations: Delegation[]
  actions: Action[]
  activeOrgId?: string
}

type AssignmentDraft = {
  label: string
  parent: string
}

const STORAGE_KEY = 'enscribe.identity.workspace.v1'

const NAME_LIMITS: Record<PlanTier, number> = {
  free: 1,
  pro: 100,
  enterprise: Number.POSITIVE_INFINITY,
}

const CHAIN_OPTIONS = Object.entries(CONTRACTS)
  .map(([chainId, config]) => ({
    chainId: Number(chainId),
    name: config.name,
  }))
  .sort((a, b) => a.name.localeCompare(b.name))

const DEFAULT_WORKSPACE: WorkspaceState = {
  orgs: [],
  projects: [],
  contracts: [],
  delegations: [],
  actions: [],
}

function makeId(prefix: string): string {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}_${crypto.randomUUID().slice(0, 8)}`
  }

  return `${prefix}_${Math.random().toString(36).slice(2, 10)}`
}

function nowIso(): string {
  return new Date().toISOString()
}

function formatTime(value: string): string {
  return new Date(value).toLocaleString()
}

function isValidAddress(value: string): boolean {
  return /^0x[a-fA-F0-9]{40}$/.test(value.trim())
}

function isValidEnsLabel(value: string): boolean {
  return /^[a-z0-9-]+$/.test(value)
}

function safeLoadWorkspace(): WorkspaceState {
  if (typeof window === 'undefined') {
    return DEFAULT_WORKSPACE
  }

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return DEFAULT_WORKSPACE
  }

  try {
    const parsed = JSON.parse(raw) as Partial<WorkspaceState>

    return {
      orgs: Array.isArray(parsed.orgs) ? parsed.orgs : [],
      projects: Array.isArray(parsed.projects) ? parsed.projects : [],
      contracts: Array.isArray(parsed.contracts) ? parsed.contracts : [],
      delegations: Array.isArray(parsed.delegations) ? parsed.delegations : [],
      actions: Array.isArray(parsed.actions) ? parsed.actions : [],
      activeOrgId: parsed.activeOrgId,
    }
  } catch {
    return DEFAULT_WORKSPACE
  }
}

function getStatusBadgeVariant(status: string):
  | 'default'
  | 'secondary'
  | 'destructive'
  | 'outline' {
  if (status === 'confirmed' || status === 'active' || status === 'named') {
    return 'default'
  }

  if (status === 'pending' || status === 'simulated') {
    return 'secondary'
  }

  return 'outline'
}

function createDemoWorkspace(): WorkspaceState {
  const orgId = makeId('org')
  const projectA = makeId('proj')
  const projectB = makeId('proj')
  const delegationId = makeId('dlg')
  const contractA = makeId('ct')
  const contractB = makeId('ct')

  return {
    activeOrgId: orgId,
    orgs: [
      {
        id: orgId,
        name: 'Atlas Protocol',
        plan: 'pro',
        createdAt: nowIso(),
      },
    ],
    projects: [
      {
        id: projectA,
        orgId,
        name: 'Core Contracts',
        chainId: 1,
        environment: 'production',
        createdAt: nowIso(),
      },
      {
        id: projectB,
        orgId,
        name: 'V2 Router',
        chainId: 8453,
        environment: 'staging',
        createdAt: nowIso(),
      },
    ],
    delegations: [
      {
        id: delegationId,
        orgId,
        parentName: 'atlas.eth',
        managerAddress: '0xA11A5aCf7A9a0d9a75F2b3e3812E4B8D4eC75A12',
        status: 'active',
        createdAt: nowIso(),
      },
    ],
    contracts: [
      {
        id: contractA,
        orgId,
        projectId: projectA,
        address: '0x1111111111111111111111111111111111111111',
        chainId: 1,
        environment: 'production',
        ensName: 'vault.atlas.eth',
        status: 'named',
        createdAt: nowIso(),
      },
      {
        id: contractB,
        orgId,
        projectId: projectB,
        address: '0x2222222222222222222222222222222222222222',
        chainId: 8453,
        environment: 'staging',
        status: 'unnamed',
        createdAt: nowIso(),
      },
    ],
    actions: [
      {
        id: makeId('act'),
        orgId,
        type: 'delegate_manager',
        title: 'Delegated manager to Enscribe',
        description:
          'atlas.eth granted manager permissions to the connected org wallet.',
        status: 'confirmed',
        resourceId: delegationId,
        chainId: 1,
        createdAt: nowIso(),
        completedAt: nowIso(),
      },
      {
        id: makeId('act'),
        orgId,
        type: 'assign_contract_name',
        title: 'Assigned contract identity',
        description:
          'vault.atlas.eth attached to 0x1111111111111111111111111111111111111111.',
        status: 'confirmed',
        resourceId: contractA,
        chainId: 1,
        createdAt: nowIso(),
        completedAt: nowIso(),
      },
    ],
  }
}

export default function IdentityWorkspacePage() {
  const { address } = useAccount()

  const [workspace, setWorkspace] = React.useState<WorkspaceState>(
    DEFAULT_WORKSPACE,
  )
  const [hydrated, setHydrated] = React.useState(false)
  const [message, setMessage] = React.useState<string>('')
  const [messageIsError, setMessageIsError] = React.useState(false)

  const [orgName, setOrgName] = React.useState('')
  const [projectName, setProjectName] = React.useState('')
  const [projectChainId, setProjectChainId] = React.useState<number>(1)
  const [projectEnvironment, setProjectEnvironment] =
    React.useState<Environment>('production')
  const [delegationParent, setDelegationParent] = React.useState('')
  const [delegationManager, setDelegationManager] = React.useState('')
  const [selectedProjectId, setSelectedProjectId] = React.useState('')
  const [contractAddress, setContractAddress] = React.useState('')
  const [contractEnvironment, setContractEnvironment] =
    React.useState<Environment>('production')

  const [assignmentDrafts, setAssignmentDrafts] = React.useState<
    Record<string, AssignmentDraft>
  >({})

  React.useEffect(() => {
    const loaded = safeLoadWorkspace()
    setWorkspace(loaded)
    setHydrated(true)
  }, [])

  React.useEffect(() => {
    if (!hydrated || typeof window === 'undefined') {
      return
    }

    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(workspace))
  }, [workspace, hydrated])

  React.useEffect(() => {
    if (address) {
      setDelegationManager(address)
    }
  }, [address])

  const activeOrg = React.useMemo(
    () => workspace.orgs.find((org) => org.id === workspace.activeOrgId),
    [workspace.orgs, workspace.activeOrgId],
  )

  const orgProjects = React.useMemo(
    () =>
      activeOrg
        ? workspace.projects.filter((project) => project.orgId === activeOrg.id)
        : [],
    [workspace.projects, activeOrg],
  )

  const orgContracts = React.useMemo(
    () =>
      activeOrg
        ? workspace.contracts.filter((contract) => contract.orgId === activeOrg.id)
        : [],
    [workspace.contracts, activeOrg],
  )

  const orgDelegations = React.useMemo(
    () =>
      activeOrg
        ? workspace.delegations.filter(
            (delegation) => delegation.orgId === activeOrg.id,
          )
        : [],
    [workspace.delegations, activeOrg],
  )

  const orgActions = React.useMemo(
    () =>
      activeOrg
        ? workspace.actions.filter((action) => action.orgId === activeOrg.id)
        : [],
    [workspace.actions, activeOrg],
  )

  const activeDelegationRoots = React.useMemo(
    () => {
      const roots = orgDelegations
        .filter(
          (delegation) =>
            delegation.status === 'active' || delegation.status === 'queued',
        )
        .map((delegation) => delegation.parentName)

      return Array.from(new Set(roots))
    },
    [orgDelegations],
  )

  const namedContracts = React.useMemo(
    () => orgContracts.filter((contract) => contract.ensName),
    [orgContracts],
  )

  const uniqueManagedNames = React.useMemo(
    () => new Set(namedContracts.map((contract) => contract.ensName)).size,
    [namedContracts],
  )

  const nameLimit = activeOrg ? NAME_LIMITS[activeOrg.plan] : NAME_LIMITS.free

  const queuedActions = React.useMemo(
    () => orgActions.filter((action) => action.status === 'queued'),
    [orgActions],
  )

  const simulatedActions = React.useMemo(
    () => orgActions.filter((action) => action.status === 'simulated'),
    [orgActions],
  )

  const actionQueueDepth = queuedActions.length + simulatedActions.length

  const signaturesSaved = Math.max(actionQueueDepth - 1, 0)

  const setBanner = React.useCallback((text: string, isError = false) => {
    setMessage(text)
    setMessageIsError(isError)
  }, [])

  const clearBanner = React.useCallback(() => {
    setMessage('')
    setMessageIsError(false)
  }, [])

  const ensureActiveOrg = React.useCallback((): string | null => {
    if (!activeOrg) {
      setBanner('Create or select an organisation first.', true)
      return null
    }

    return activeOrg.id
  }, [activeOrg, setBanner])

  const handleCreateOrg = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      clearBanner()

      const name = orgName.trim()
      if (!name) {
        setBanner('Organisation name is required.', true)
        return
      }

      const nextOrg: Org = {
        id: makeId('org'),
        name,
        plan: 'free',
        createdAt: nowIso(),
      }

      setWorkspace((previous) => ({
        ...previous,
        orgs: [nextOrg, ...previous.orgs],
        activeOrgId: nextOrg.id,
      }))
      setOrgName('')
      setBanner('Organisation created. You can now import contracts.')
    },
    [clearBanner, orgName, setBanner],
  )

  const handlePlanChange = React.useCallback(
    (plan: PlanTier) => {
      const orgId = ensureActiveOrg()
      if (!orgId) {
        return
      }

      setWorkspace((previous) => ({
        ...previous,
        orgs: previous.orgs.map((org) =>
          org.id === orgId
            ? {
                ...org,
                plan,
              }
            : org,
        ),
      }))

      setBanner(`Plan switched to ${plan}.`)
    },
    [ensureActiveOrg, setBanner],
  )

  const handleCreateProject = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      clearBanner()

      const orgId = ensureActiveOrg()
      if (!orgId) {
        return
      }

      const name = projectName.trim()
      if (!name) {
        setBanner('Project name is required.', true)
        return
      }

      const project: Project = {
        id: makeId('proj'),
        orgId,
        name,
        chainId: projectChainId,
        environment: projectEnvironment,
        createdAt: nowIso(),
      }

      setWorkspace((previous) => ({
        ...previous,
        projects: [project, ...previous.projects],
      }))

      setProjectName('')
      setSelectedProjectId(project.id)
      setBanner('Project created and ready for contract import.')
    },
    [
      clearBanner,
      ensureActiveOrg,
      projectChainId,
      projectEnvironment,
      projectName,
      setBanner,
    ],
  )

  const handleQueueDelegation = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      clearBanner()

      const orgId = ensureActiveOrg()
      if (!orgId) {
        return
      }

      const parentName = delegationParent.trim().toLowerCase()
      if (!parentName.includes('.')) {
        setBanner('Use a valid ENS name like protocol.eth.', true)
        return
      }

      const managerAddress = delegationManager.trim()
      if (!isValidAddress(managerAddress)) {
        setBanner('Manager wallet must be a valid 0x address.', true)
        return
      }

      const delegation: Delegation = {
        id: makeId('dlg'),
        orgId,
        parentName,
        managerAddress,
        status: 'queued',
        createdAt: nowIso(),
      }

      const action: Action = {
        id: makeId('act'),
        orgId,
        type: 'delegate_manager',
        title: `Delegate ${parentName} manager role`,
        description: `Queue manager permission for ${managerAddress}.`,
        status: 'queued',
        resourceId: delegation.id,
        chainId: 1,
        createdAt: nowIso(),
      }

      setWorkspace((previous) => ({
        ...previous,
        delegations: [delegation, ...previous.delegations],
        actions: [action, ...previous.actions],
      }))

      setDelegationParent('')
      setBanner('Delegation added to transaction queue. Batch-sign when ready.')
    },
    [
      clearBanner,
      delegationManager,
      delegationParent,
      ensureActiveOrg,
      setBanner,
    ],
  )

  const handleImportContract = React.useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault()
      clearBanner()

      const orgId = ensureActiveOrg()
      if (!orgId) {
        return
      }

      if (!selectedProjectId) {
        setBanner('Choose a project before importing a contract.', true)
        return
      }

      const project = workspace.projects.find(
        (item) => item.id === selectedProjectId && item.orgId === orgId,
      )

      if (!project) {
        setBanner('Selected project was not found.', true)
        return
      }

      const addressValue = contractAddress.trim()
      if (!isValidAddress(addressValue)) {
        setBanner('Contract address must be a valid 0x address.', true)
        return
      }

      const duplicate = workspace.contracts.find(
        (contract) =>
          contract.orgId === orgId &&
          contract.chainId === project.chainId &&
          contract.address.toLowerCase() === addressValue.toLowerCase(),
      )

      if (duplicate) {
        setBanner('This contract is already in your inventory.', true)
        return
      }

      const contractId = makeId('ct')
      const contract: ContractIdentity = {
        id: contractId,
        orgId,
        projectId: project.id,
        address: addressValue,
        chainId: project.chainId,
        environment: contractEnvironment,
        status: 'unnamed',
        createdAt: nowIso(),
      }

      const action: Action = {
        id: makeId('act'),
        orgId,
        type: 'import_contract',
        title: `Import ${addressValue.slice(0, 8)}...`,
        description: `Tracked under ${project.name} (${project.environment}).`,
        status: 'queued',
        resourceId: contractId,
        chainId: project.chainId,
        createdAt: nowIso(),
      }

      setWorkspace((previous) => ({
        ...previous,
        contracts: [contract, ...previous.contracts],
        actions: [action, ...previous.actions],
      }))

      setContractAddress('')
      setBanner('Contract imported. Next step: assign a name and batch submit.')
    },
    [
      clearBanner,
      contractAddress,
      contractEnvironment,
      ensureActiveOrg,
      selectedProjectId,
      setBanner,
      workspace.contracts,
      workspace.projects,
    ],
  )

  const handleAssignName = React.useCallback(
    (contract: ContractIdentity) => {
      clearBanner()

      const orgId = ensureActiveOrg()
      if (!orgId) {
        return
      }

      const draft = assignmentDrafts[contract.id]
      const label = draft?.label?.trim().toLowerCase()
      const parent = draft?.parent?.trim().toLowerCase()

      if (!label || !parent) {
        setBanner('Add both a label and a delegated parent ENS name.', true)
        return
      }

      if (!isValidEnsLabel(label)) {
        setBanner('Label accepts lowercase letters, numbers, and hyphens.', true)
        return
      }

      if (!activeDelegationRoots.includes(parent)) {
        setBanner('Delegate ENS manager permission for this parent first.', true)
        return
      }

      const targetName = `${label}.${parent}`
      const plan = activeOrg ? activeOrg.plan : 'free'
      const limit = NAME_LIMITS[plan]
      const existingNames = new Set(
        workspace.contracts
          .filter((item) => item.orgId === orgId && item.ensName)
          .map((item) => item.ensName as string),
      )

      if (!contract.ensName || contract.ensName !== targetName) {
        existingNames.add(targetName)
      }

      if (existingNames.size > limit) {
        setBanner(
          `The ${plan} plan allows ${limit} managed ENS name${limit > 1 ? 's' : ''}. Upgrade to add more.`,
          true,
        )
        return
      }

      const action: Action = {
        id: makeId('act'),
        orgId,
        type: 'assign_contract_name',
        title: `Assign ${targetName}`,
        description: `Attach identity to ${contract.address}.`,
        status: 'queued',
        resourceId: contract.id,
        chainId: contract.chainId,
        createdAt: nowIso(),
      }

      setWorkspace((previous) => ({
        ...previous,
        contracts: previous.contracts.map((item) =>
          item.id === contract.id
            ? {
                ...item,
                ensName: targetName,
                status: 'pending',
              }
            : item,
        ),
        actions: [action, ...previous.actions],
      }))

      setBanner(`${targetName} queued. Use batch submit to confirm onchain.`)
    },
    [
      activeDelegationRoots,
      activeOrg,
      assignmentDrafts,
      clearBanner,
      ensureActiveOrg,
      setBanner,
      workspace.contracts,
    ],
  )

  const handleSimulate = React.useCallback(() => {
    const orgId = ensureActiveOrg()
    if (!orgId) {
      return
    }

    const hasQueued = workspace.actions.some(
      (action) => action.orgId === orgId && action.status === 'queued',
    )

    if (!hasQueued) {
      setBanner('No queued actions to simulate.', true)
      return
    }

    setWorkspace((previous) => ({
      ...previous,
      actions: previous.actions.map((action) =>
        action.orgId === orgId && action.status === 'queued'
          ? {
              ...action,
              status: 'simulated',
            }
          : action,
      ),
    }))

    setBanner('Simulation complete. Queue is ready for a single signing action.')
  }, [ensureActiveOrg, setBanner, workspace.actions])

  const handleSubmitBatch = React.useCallback(() => {
    const orgId = ensureActiveOrg()
    if (!orgId) {
      return
    }

    const hasPrepared = workspace.actions.some(
      (action) =>
        action.orgId === orgId &&
        (action.status === 'queued' || action.status === 'simulated'),
    )

    if (!hasPrepared) {
      setBanner('No batched actions ready to submit.', true)
      return
    }

    setWorkspace((previous) => ({
      ...previous,
      actions: previous.actions.map((action) => {
        if (
          action.orgId === orgId &&
          (action.status === 'queued' || action.status === 'simulated')
        ) {
          return {
            ...action,
            status: 'confirmed',
            completedAt: nowIso(),
          }
        }

        return action
      }),
      delegations: previous.delegations.map((delegation) => {
        const related = previous.actions.find(
          (action) =>
            action.orgId === orgId &&
            action.resourceId === delegation.id &&
            action.type === 'delegate_manager' &&
            (action.status === 'queued' || action.status === 'simulated'),
        )

        if (related) {
          return {
            ...delegation,
            status: 'active',
          }
        }

        return delegation
      }),
      contracts: previous.contracts.map((contract) => {
        const related = previous.actions.find(
          (action) =>
            action.orgId === orgId &&
            action.resourceId === contract.id &&
            action.type === 'assign_contract_name' &&
            (action.status === 'queued' || action.status === 'simulated'),
        )

        if (related) {
          return {
            ...contract,
            status: 'named',
          }
        }

        return contract
      }),
    }))

    setBanner('Batch submitted. All prepared actions were confirmed.')
  }, [ensureActiveOrg, setBanner, workspace.actions])

  const handleClearCompleted = React.useCallback(() => {
    const orgId = ensureActiveOrg()
    if (!orgId) {
      return
    }

    setWorkspace((previous) => ({
      ...previous,
      actions: previous.actions.filter(
        (action) =>
          !(action.orgId === orgId && action.status === 'confirmed'),
      ),
    }))

    setBanner('Confirmed actions cleared from the queue view.')
  }, [ensureActiveOrg, setBanner])

  const handleLoadDemo = React.useCallback(() => {
    setWorkspace(createDemoWorkspace())
    setSelectedProjectId('')
    setContractAddress('')
    setAssignmentDrafts({})
    setBanner('Demo workspace loaded. You can edit or replace it at any time.')
  }, [setBanner])

  const updateDraft = React.useCallback(
    (contractId: string, patch: Partial<AssignmentDraft>) => {
      setAssignmentDrafts((previous) => ({
        ...previous,
        [contractId]: {
          label: previous[contractId]?.label || '',
          parent: previous[contractId]?.parent || activeDelegationRoots[0] || '',
          ...patch,
        },
      }))
    },
    [activeDelegationRoots],
  )

  const hasWorkspace = workspace.orgs.length > 0

  return (
    <Layout>
      <div className="mx-auto w-full max-w-7xl space-y-6">
        <Card className="border-0 bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 text-white shadow-xl">
          <CardHeader className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="secondary" className="bg-white/15 text-white">
                Contract Identity Cloud
              </Badge>
              <Badge variant="secondary" className="bg-white/15 text-white">
                ENS Manager Delegation
              </Badge>
              <Badge variant="secondary" className="bg-white/15 text-white">
                Batch Signing
              </Badge>
            </div>
            <CardTitle className="text-3xl md:text-4xl font-semibold leading-tight">
              Operate smart contract identity for your organisation in one place
            </CardTitle>
            <CardDescription className="text-slate-200 max-w-3xl">
              Modelled for protocol and enterprise teams: track contract
              inventory, delegate ENS manager permissions, assign names, and
              batch transactions to reduce signing overhead.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-200">
                  Organisations
                </p>
                <p className="mt-2 text-2xl font-semibold">{workspace.orgs.length}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-200">
                  Projects
                </p>
                <p className="mt-2 text-2xl font-semibold">{workspace.projects.length}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-200">
                  Managed names
                </p>
                <p className="mt-2 text-2xl font-semibold">{uniqueManagedNames}</p>
              </div>
              <div className="rounded-lg bg-white/10 p-4">
                <p className="text-xs uppercase tracking-wide text-slate-200">
                  Queue depth
                </p>
                <p className="mt-2 text-2xl font-semibold">{actionQueueDepth}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {message ? (
          <div
            className={`rounded-md border px-4 py-3 text-sm ${
              messageIsError
                ? 'border-red-400 bg-red-50 text-red-700'
                : 'border-emerald-400 bg-emerald-50 text-emerald-700'
            }`}
          >
            {message}
          </div>
        ) : null}

        {!hasWorkspace ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">Start your identity workspace</CardTitle>
              <CardDescription>
                Create an organisation from scratch or load a demo workspace to
                test the full flow immediately.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3">
              <Button onClick={handleLoadDemo}>
                <Sparkles className="h-4 w-4" /> Load demo workspace
              </Button>
              <Button variant="outline" asChild>
                <Link href="/nameContract">Use legacy naming flow</Link>
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="h-auto w-full justify-start overflow-x-auto p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="inventory">Inventory</TabsTrigger>
            <TabsTrigger value="transactions">Transactions</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Building2 className="h-5 w-5" /> Organisation
                  </CardTitle>
                  <CardDescription>
                    Create org workspaces and switch plans between free, pro,
                    and enterprise.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleCreateOrg} className="flex gap-2">
                    <Input
                      value={orgName}
                      onChange={(event) => setOrgName(event.target.value)}
                      placeholder="Atlas Protocol"
                    />
                    <Button type="submit">Create org</Button>
                  </form>

                  <div className="space-y-3">
                    <label className="text-sm font-medium">Active organisation</label>
                    <select
                      className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={activeOrg?.id || ''}
                      onChange={(event) =>
                        setWorkspace((previous) => ({
                          ...previous,
                          activeOrgId: event.target.value,
                        }))
                      }
                    >
                      <option value="" disabled>
                        Select organisation
                      </option>
                      {workspace.orgs.map((org) => (
                        <option key={org.id} value={org.id}>
                          {org.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm font-medium">Plan</p>
                    <div className="flex flex-wrap gap-2">
                      {(['free', 'pro', 'enterprise'] as PlanTier[]).map((plan) => (
                        <Button
                          key={plan}
                          type="button"
                          variant={activeOrg?.plan === plan ? 'default' : 'outline'}
                          onClick={() => handlePlanChange(plan)}
                        >
                          {plan}
                        </Button>
                      ))}
                    </div>
                    {activeOrg ? (
                      <p className="text-sm text-muted-foreground">
                        Current usage: {uniqueManagedNames}/
                        {Number.isFinite(nameLimit) ? nameLimit : 'unlimited'} managed
                        names.
                      </p>
                    ) : null}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Link2 className="h-5 w-5" /> ENS Delegation
                  </CardTitle>
                  <CardDescription>
                    Queue ENS manager delegation to Enscribe so your org can
                    assign names faster.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <form onSubmit={handleQueueDelegation} className="space-y-3">
                    <Input
                      value={delegationParent}
                      onChange={(event) => setDelegationParent(event.target.value)}
                      placeholder="atlas.eth"
                    />
                    <Input
                      value={delegationManager}
                      onChange={(event) => setDelegationManager(event.target.value)}
                      placeholder="0x... manager wallet"
                    />
                    <Button type="submit" className="w-full">
                      Queue delegation
                    </Button>
                  </form>

                  <div className="space-y-2">
                    {orgDelegations.length === 0 ? (
                      <p className="text-sm text-muted-foreground">
                        No delegated names yet.
                      </p>
                    ) : (
                      orgDelegations.slice(0, 4).map((delegation) => (
                        <div
                          key={delegation.id}
                          className="flex items-center justify-between rounded-md border p-2"
                        >
                          <div>
                            <p className="text-sm font-medium">{delegation.parentName}</p>
                            <p className="text-xs text-muted-foreground">
                              {delegation.managerAddress}
                            </p>
                          </div>
                          <Badge variant={getStatusBadgeVariant(delegation.status)}>
                            {delegation.status}
                          </Badge>
                        </div>
                      ))
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BriefcaseBusiness className="h-5 w-5" /> Projects
                </CardTitle>
                <CardDescription>
                  Organise contract inventory by project, chain, and environment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={handleCreateProject}
                  className="grid gap-3 md:grid-cols-4"
                >
                  <Input
                    value={projectName}
                    onChange={(event) => setProjectName(event.target.value)}
                    placeholder="Treasury"
                    className="md:col-span-2"
                  />
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={projectChainId}
                    onChange={(event) => setProjectChainId(Number(event.target.value))}
                  >
                    {CHAIN_OPTIONS.map((chain) => (
                      <option key={chain.chainId} value={chain.chainId}>
                        {chain.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={projectEnvironment}
                    onChange={(event) =>
                      setProjectEnvironment(event.target.value as Environment)
                    }
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                  <Button type="submit" className="md:col-span-4">
                    Create project
                  </Button>
                </form>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Chain</TableHead>
                      <TableHead>Environment</TableHead>
                      <TableHead>Created</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgProjects.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          No projects yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orgProjects.map((project) => (
                        <TableRow key={project.id}>
                          <TableCell className="font-medium">{project.name}</TableCell>
                          <TableCell>
                            {CONTRACTS[project.chainId]?.name || project.chainId}
                          </TableCell>
                          <TableCell>{project.environment}</TableCell>
                          <TableCell>{formatTime(project.createdAt)}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="inventory" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Layers className="h-5 w-5" /> Contract Inventory
                </CardTitle>
                <CardDescription>
                  Import deployed contracts and attach ENS identities directly to
                  each deployment.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form
                  onSubmit={handleImportContract}
                  className="grid gap-3 md:grid-cols-4"
                >
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={selectedProjectId}
                    onChange={(event) => setSelectedProjectId(event.target.value)}
                  >
                    <option value="">Select project</option>
                    {orgProjects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm"
                    value={contractEnvironment}
                    onChange={(event) =>
                      setContractEnvironment(event.target.value as Environment)
                    }
                  >
                    <option value="production">Production</option>
                    <option value="staging">Staging</option>
                    <option value="development">Development</option>
                  </select>
                  <Input
                    value={contractAddress}
                    onChange={(event) => setContractAddress(event.target.value)}
                    placeholder="0x..."
                    className="md:col-span-2"
                  />
                  <Button type="submit" className="md:col-span-4">
                    Import contract
                  </Button>
                </form>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Contract</TableHead>
                      <TableHead>Project</TableHead>
                      <TableHead>Identity</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Assign Name</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgContracts.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="text-muted-foreground">
                          No contracts in inventory.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orgContracts.map((contract) => {
                        const project = orgProjects.find(
                          (item) => item.id === contract.projectId,
                        )
                        const draft = assignmentDrafts[contract.id] || {
                          label: '',
                          parent: activeDelegationRoots[0] || '',
                        }

                        return (
                          <TableRow key={contract.id}>
                            <TableCell>
                              <p className="font-medium">{contract.address}</p>
                              <p className="text-xs text-muted-foreground">
                                {CONTRACTS[contract.chainId]?.name || contract.chainId}
                              </p>
                            </TableCell>
                            <TableCell>
                              <p>{project?.name || 'Unknown project'}</p>
                              <p className="text-xs text-muted-foreground">
                                {contract.environment}
                              </p>
                            </TableCell>
                            <TableCell className="font-medium">
                              {contract.ensName || 'Unassigned'}
                            </TableCell>
                            <TableCell>
                              <Badge variant={getStatusBadgeVariant(contract.status)}>
                                {contract.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-2 md:flex-row">
                                <Input
                                  value={draft.label}
                                  onChange={(event) =>
                                    updateDraft(contract.id, {
                                      label: event.target.value,
                                    })
                                  }
                                  placeholder="vault"
                                  className="md:w-32"
                                />
                                <select
                                  className="h-9 rounded-md border border-input bg-background px-3 text-sm md:w-48"
                                  value={draft.parent}
                                  onChange={(event) =>
                                    updateDraft(contract.id, {
                                      parent: event.target.value,
                                    })
                                  }
                                >
                                  <option value="">Parent ENS</option>
                                  {activeDelegationRoots.map((parent) => (
                                    <option key={parent} value={parent}>
                                      {parent}
                                    </option>
                                  ))}
                                </select>
                                <Button
                                  type="button"
                                  variant="outline"
                                  onClick={() => handleAssignName(contract)}
                                >
                                  Queue
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="transactions" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Queued</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{queuedActions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Simulated</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{simulatedActions.length}</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Estimated signatures saved</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-semibold">{signaturesSaved}</p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" /> Batched transaction queue
                </CardTitle>
                <CardDescription>
                  Simulate first, then submit all prepared actions in one signing
                  flow.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Button onClick={handleSimulate} variant="outline">
                    Run simulation
                  </Button>
                  <Button onClick={handleSubmitBatch}>Sign once and submit</Button>
                  <Button onClick={handleClearCompleted} variant="outline">
                    Clear confirmed
                  </Button>
                </div>

                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Action</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orgActions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-muted-foreground">
                          No queued actions yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      orgActions.map((action) => (
                        <TableRow key={action.id}>
                          <TableCell className="font-medium">{action.title}</TableCell>
                          <TableCell>{action.description}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusBadgeVariant(action.status)}>
                              {action.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            {formatTime(action.completedAt || action.createdAt)}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="billing" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card className={activeOrg?.plan === 'free' ? 'border-slate-900' : ''}>
                <CardHeader>
                  <CardTitle>Free</CardTitle>
                  <CardDescription>Best for solo projects and PoCs.</CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>1 managed ENS name</p>
                  <p>Basic queue + history</p>
                  <Button
                    type="button"
                    variant={activeOrg?.plan === 'free' ? 'default' : 'outline'}
                    onClick={() => handlePlanChange('free')}
                  >
                    Select Free
                  </Button>
                </CardContent>
              </Card>

              <Card className={activeOrg?.plan === 'pro' ? 'border-slate-900' : ''}>
                <CardHeader>
                  <CardTitle>Pro</CardTitle>
                  <CardDescription>
                    For active protocol teams and multi-chain apps.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Up to 100 managed ENS names</p>
                  <p>Batch operations + role workflows</p>
                  <Button
                    type="button"
                    variant={activeOrg?.plan === 'pro' ? 'default' : 'outline'}
                    onClick={() => handlePlanChange('pro')}
                  >
                    Select Pro
                  </Button>
                </CardContent>
              </Card>

              <Card
                className={activeOrg?.plan === 'enterprise' ? 'border-slate-900' : ''}
              >
                <CardHeader>
                  <CardTitle>Enterprise</CardTitle>
                  <CardDescription>
                    For compliance-heavy orgs with larger contract inventories.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-2 text-sm text-muted-foreground">
                  <p>Unlimited managed names</p>
                  <p>Priority support + policy controls</p>
                  <Button
                    type="button"
                    variant={
                      activeOrg?.plan === 'enterprise' ? 'default' : 'outline'
                    }
                    onClick={() => handlePlanChange('enterprise')}
                  >
                    Select Enterprise
                  </Button>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="h-5 w-5" /> Enterprise-readiness
                </CardTitle>
                <CardDescription>
                  Built for teams that require control, speed, and auditability.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3 text-sm">
                <div className="rounded-md border p-3">
                  <p className="font-medium">Role-based operations</p>
                  <p className="text-muted-foreground mt-1">
                    Distinguish deployers, reviewers, and billing admins.
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-medium">Wallet-aware execution</p>
                  <p className="text-muted-foreground mt-1">
                    Connected wallet: {address || 'not connected'}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="font-medium">Full audit timeline</p>
                  <p className="text-muted-foreground mt-1">
                    Every queued and confirmed action remains traceable.
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <Card className="border-dashed">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Wallet className="h-4 w-4" /> Existing Enscribe tools stay available
            </CardTitle>
            <CardDescription>
              You can keep using the original flows while migrating teams into
              the identity workspace.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <Button variant="outline" asChild>
              <Link href="/nameContract">Name Contract</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/batchNaming">Batch Naming</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/deploy">Deploy Contract</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  )
}
