'use client'

import React, { useMemo, useState } from 'react'
import Layout from '@/components/Layout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SendHorizonal } from 'lucide-react'
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { sendTransaction, waitForTransactionReceipt } from 'viem/actions'
import { waitForChainSwitch, getChainName, getViemChain } from '@/lib/chains'
import { getPublicClient } from '@/lib/viemClient'

type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  text: string
}

type PromptParams = {
  chainId: number
  contractAddress: `0x${string}`
  walletAddress: `0x${string}`
  ensName: string
}

type ParsedPrompt = {
  chainId: number
  contractAddress: `0x${string}`
  ensName: string
}

type PlanStep = {
  id: string
  chainId: number
  to: `0x${string}`
  data: `0x${string}`
  value: '0x0'
  description: string
  method: string
}

type BuildPlanOutput = {
  operationId: string
  chainId: number
  plan: PlanStep[]
  isNoop?: boolean
}

type PreflightOutput = {
  canSetPrimaryName: boolean
  recommendedPath: 'ownable' | 'reverse-claimer' | 'none'
  warnings?: string[]
  forwardResolution?: {
    alreadySet?: boolean
    currentAddress?: string | null
  }
  reverseResolution?: {
    alreadySet?: boolean
    currentName?: string | null
  }
}

type StatusOutput = {
  txStatuses: Array<{
    hash: string
    state: 'pending' | 'success' | 'reverted' | 'unknown'
    blockNumber?: string
    error?: string
  }>
  summary?: {
    status?: 'completed' | 'failed' | 'pending' | 'confirmed' | 'idle'
    verificationComplete?: boolean
  }
  verification?: {
    forwardMatches: boolean
    reverseMatches: boolean
  }
}

type PendingApproval = {
  params: PromptParams
  preflight: PreflightOutput
  plan: BuildPlanOutput
}

const ADDRESS_REGEX = /0x[a-fA-F0-9]{40}/g
const ENS_CANDIDATE_REGEX =
  /\b([a-z0-9](?:[a-z0-9-]{0,62})(?:\.[a-z0-9](?:[a-z0-9-]{0,62}))+)\b/gi

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function normalizeEnsName(raw: string): string {
  return raw.trim().replace(/\.$/, '').toLowerCase()
}

function inferEnsName(prompt: string): string | null {
  const taggedEns = prompt.match(/ens(?:\s*name)?\s*[:=]?\s*([^\s,;]+)/i)?.[1]
  const taggedPrimary = prompt.match(
    /primary\s*name\s*[:=]?\s*([^\s,;]+)/i,
  )?.[1]

  const tagged = taggedEns ?? taggedPrimary
  if (tagged) {
    const normalized = normalizeEnsName(tagged)
    if (normalized.includes('.') && !normalized.startsWith('0x')) return normalized
  }

  const candidates = [...prompt.matchAll(ENS_CANDIDATE_REGEX)]
    .map((m) => normalizeEnsName(m[1]))
    .filter(
      (value) =>
        value.includes('.') &&
        !value.startsWith('0x') &&
        !value.startsWith('http') &&
        !value.includes('..'),
    )

  return candidates[0] ?? null
}

function parsePrompt(prompt: string): ParsedPrompt | null {
  const chainById = prompt.match(/chain\s*id\s*[:=]\s*(\d+)/i)
  const chainIdTag = prompt.match(/chainId\s*[:=]\s*(\d+)/i)

  let chainId = Number(chainById?.[1] ?? chainIdTag?.[1] ?? 0)
  if (!chainId) {
    if (/sepolia/i.test(prompt)) chainId = 11155111
    if (/ethereum mainnet|\bmainnet\b/i.test(prompt)) chainId = 1
    if (/base sepolia/i.test(prompt)) chainId = 84532
    if (/base mainnet|\bbase\b/i.test(prompt)) chainId = 8453
  }

  const contractTag = prompt.match(
    /contract(?:\s*address)?\s*[:=]?\s*(0x[a-fA-F0-9]{40})/i,
  )
  const allAddresses = [...prompt.matchAll(ADDRESS_REGEX)].map((m) => m[0])

  const contractAddress = contractTag?.[1] ?? allAddresses[0] ?? ''
  const ensName = inferEnsName(prompt) ?? ''

  if (
    !chainId ||
    !/^0x[a-fA-F0-9]{40}$/.test(contractAddress) ||
    !ensName.includes('.')
  ) {
    return null
  }

  return {
    chainId,
    contractAddress: contractAddress as `0x${string}`,
    ensName,
  }
}

async function callMcpTool<T>(name: string, args: Record<string, unknown>): Promise<T> {
  const response = await fetch('/api/mcp', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    }),
  })

  if (!response.ok) {
    throw new Error(`MCP request failed (${response.status}).`)
  }

  const json = await response.json()
  if (json.error) {
    throw new Error(json.error.message || 'MCP error')
  }

  const result = json.result
  if (!result) {
    throw new Error('Missing MCP result payload.')
  }

  if (result.isError) {
    const message = result.content?.[0]?.text || 'MCP tool failed.'
    throw new Error(message)
  }

  const text = result.content?.[0]?.text
  if (typeof text !== 'string') {
    throw new Error('Invalid MCP tool response format.')
  }

  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error('MCP tool returned non-JSON response.')
  }
}

function formatTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

export default function AIPage() {
  const [prompt, setPrompt] = useState('')
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Connect your wallet, then describe what you want (for example: "set mcptest2.abhi.eth to my contract 0x... on sepolia").',
    },
  ])
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(
    null,
  )
  const [executionStatus, setExecutionStatus] = useState<StatusOutput | null>(
    null,
  )
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const { address: connectedWallet, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  const sendDisabled = useMemo(() => {
    return !connectedWallet || !prompt.trim() || isPlanning || isExecuting
  }, [connectedWallet, prompt, isPlanning, isExecuting])

  function appendMessage(role: ChatMessage['role'], text: string) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setMessages((prev) => [...prev, { id, role, text }])
  }

  async function handleSendPrompt() {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setPrompt('')
    appendMessage('user', trimmed)
    setExecutionStatus(null)

    if (!connectedWallet) {
      appendMessage(
        'assistant',
        'Connect your wallet first. Naming flows require an active wallet connection.',
      )
      return
    }

    const parsedInput = parsePrompt(trimmed)
    const parsed = parsedInput
      ? {
          ...parsedInput,
          walletAddress: connectedWallet as `0x${string}`,
        }
      : null

    if (!parsed) {
      appendMessage(
        'assistant',
        'Unable to parse your prompt. Include a contract address, an ENS name, and a network (e.g. sepolia/mainnet/base).',
      )
      return
    }

    setIsPlanning(true)
    appendMessage('assistant', 'Running preflight checks...')

    try {
      const preflight = await callMcpTool<PreflightOutput>(
        'ens_preflight_set_primary_name',
        parsed,
      )

      appendMessage('assistant', 'Building transaction plan...')

      const plan = await callMcpTool<BuildPlanOutput>(
        'ens_build_primary_name_tx_plan',
        parsed,
      )

      setPendingApproval({ params: parsed, preflight, plan })

      appendMessage(
        'assistant',
        plan.isNoop
          ? 'No on-chain writes are required. Records already match.'
          : `Plan ready with ${plan.plan.length} transaction(s). Review and approve below.`,
      )
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to plan.'
      appendMessage('assistant', `Planning failed: ${message}`)
    } finally {
      setIsPlanning(false)
    }
  }

  function handleRejectPlan() {
    setPendingApproval(null)
    appendMessage('assistant', 'Plan rejected. No transactions were sent.')
  }

  async function handleApprovePlan() {
    if (!pendingApproval) return

    if (!walletClient || !connectedWallet) {
      appendMessage('assistant', 'Connect your wallet to continue.')
      return
    }

    if (
      connectedWallet.toLowerCase() !==
      pendingApproval.params.walletAddress.toLowerCase()
    ) {
      appendMessage(
        'assistant',
        `Connected wallet ${connectedWallet} does not match requested owner ${pendingApproval.params.walletAddress}.`,
      )
      return
    }

    setIsExecuting(true)

    try {
      if (chain?.id !== pendingApproval.params.chainId) {
        appendMessage(
          'assistant',
          `Switching wallet to ${getChainName(pendingApproval.params.chainId) || `chain ${pendingApproval.params.chainId}`}`,
        )

        await waitForChainSwitch(
          walletClient,
          switchChain,
          pendingApproval.params.chainId,
          getChainName(pendingApproval.params.chainId) ||
            `chain ${pendingApproval.params.chainId}`,
        )
      }

      const txHashes: string[] = []
      const publicClient = getPublicClient(pendingApproval.params.chainId)
      if (!publicClient) {
        throw new Error(
          `No RPC client available for chain ${pendingApproval.params.chainId}.`,
        )
      }

      for (const step of pendingApproval.plan.plan) {
        appendMessage('assistant', `Awaiting wallet signature: ${step.description}`)

        // Estimate gas up front to avoid wallet/provider fallback defaults.
        const estimatedGas = await publicClient.estimateGas({
          account: connectedWallet,
          to: step.to,
          data: step.data,
          value: 0n,
        })
        const bufferedGas = (estimatedGas * 12n) / 10n

        const txHash = await sendTransaction(walletClient, {
          account: connectedWallet,
          chain: getViemChain(step.chainId),
          to: step.to,
          data: step.data,
          value: 0n,
          gas: bufferedGas,
        })

        txHashes.push(txHash)
        appendMessage(
          'assistant',
          `Transaction submitted (${step.method}): ${formatTxHash(txHash)}`,
        )

        // Ensure step dependencies are mined before executing the next step.
        const receipt = await waitForTransactionReceipt(publicClient, {
          hash: txHash,
        })
        if (receipt.status !== 'success') {
          throw new Error(
            `Transaction reverted (${step.method}) after submission: ${txHash}`,
          )
        }
        appendMessage(
          'assistant',
          `Transaction confirmed (${step.method}) in block ${receipt.blockNumber.toString()}.`,
        )
      }

      appendMessage('assistant', 'Tracking confirmations and ENS verification...')

      let finalStatus: StatusOutput | null = null

      for (let attempt = 0; attempt < 24; attempt++) {
        const status = await callMcpTool<StatusOutput>(
          'ens_get_primary_name_status',
          {
            chainId: pendingApproval.params.chainId,
            txHashes,
            contractAddress: pendingApproval.params.contractAddress,
            ensName: pendingApproval.params.ensName,
          },
        )

        setExecutionStatus(status)
        finalStatus = status

        const summaryStatus = status.summary?.status
        if (summaryStatus === 'completed' || summaryStatus === 'failed') {
          break
        }

        await sleep(5000)
      }

      const endedAs = finalStatus?.summary?.status
      if (endedAs === 'completed') {
        appendMessage('assistant', 'Primary naming flow completed successfully.')
      } else if (endedAs === 'failed') {
        appendMessage(
          'assistant',
          'Primary naming flow failed on-chain. Check the status panel for details.',
        )
      } else {
        appendMessage(
          'assistant',
          'Transactions submitted. Confirmation is still pending. You can retry status checks.',
        )
      }

      setPendingApproval(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Execution failed.'
      appendMessage('assistant', `Execution failed: ${message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">AI</h1>
          <p className="text-sm text-muted-foreground">
            Ask the assistant to plan and execute primary naming using your
            connected wallet.
          </p>

          <div className="space-y-2 pt-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'ml-auto bg-primary text-primary-foreground'
                    : 'bg-muted text-foreground'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>

          {pendingApproval && (
            <Card>
              <CardHeader>
                <CardTitle>Approval Required</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">
                    Chain {pendingApproval.params.chainId}
                  </Badge>
                  <Badge variant="secondary">{pendingApproval.params.ensName}</Badge>
                  <Badge variant="secondary">
                    {pendingApproval.plan.plan.length} tx
                  </Badge>
                </div>

                <div className="space-y-2 text-sm">
                  {pendingApproval.plan.plan.map((step) => (
                    <div
                      key={step.id}
                      className="rounded-md border bg-background px-3 py-2"
                    >
                      <div className="font-medium">{step.description}</div>
                      <div className="text-muted-foreground text-xs mt-1">
                        {step.method} on {step.to}
                      </div>
                    </div>
                  ))}
                </div>

                {pendingApproval.preflight.warnings &&
                  pendingApproval.preflight.warnings.length > 0 && (
                    <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                      {pendingApproval.preflight.warnings.join(' ')}
                    </div>
                  )}

                <div className="flex gap-2">
                  <Button
                    type="button"
                    onClick={handleApprovePlan}
                    disabled={isExecuting || pendingApproval.plan.plan.length === 0}
                  >
                    Yes, Sign Transactions
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleRejectPlan}
                    disabled={isExecuting}
                  >
                    No
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {executionStatus && (
            <Card>
              <CardHeader>
                <CardTitle>Execution Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm">
                  Summary: {executionStatus.summary?.status || 'unknown'}
                </div>

                <div className="space-y-2 text-xs">
                  {executionStatus.txStatuses.map((tx) => (
                    <div
                      key={tx.hash}
                      className="rounded-md border bg-background px-3 py-2"
                    >
                      <div>{tx.hash}</div>
                      <div className="text-muted-foreground">
                        state: {tx.state}
                        {tx.blockNumber ? `, block: ${tx.blockNumber}` : ''}
                      </div>
                    </div>
                  ))}
                </div>

                {executionStatus.verification && (
                  <div className="text-xs text-muted-foreground">
                    forwardMatches: {String(executionStatus.verification.forwardMatches)}{' '}
                    | reverseMatches: {String(executionStatus.verification.reverseMatches)}
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </div>

        <div className="mt-4 rounded-lg border bg-card p-3">
          <div className="flex items-end gap-3">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Example: set mcptest2.abhi.eth name to my contract 0x... on sepolia"
              className="min-h-[96px] resize-y"
              disabled={isPlanning || isExecuting}
            />
            <Button
              type="button"
              className="h-10 shrink-0"
              disabled={sendDisabled}
              onClick={handleSendPrompt}
            >
              <SendHorizonal className="h-4 w-4" />
              Send
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  )
}
