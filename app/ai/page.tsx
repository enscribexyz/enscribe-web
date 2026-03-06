'use client'

import React, { useEffect, useMemo, useRef, useState } from 'react'
import Layout from '@/components/Layout'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useAccount, useSwitchChain, useWalletClient } from 'wagmi'
import { isAddress } from 'viem'
import { sendTransaction, waitForTransactionReceipt } from 'viem/actions'
import { waitForChainSwitch, getChainName, getViemChain } from '@/lib/chains'
import { getPublicClient } from '@/lib/viemClient'
import { CONTRACTS } from '@/utils/constants'
import { formatNamespaceLookupMessage } from '@/lib/ai/namespaceLookupFormatter'

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

type IntentModelResponse = {
  model: string
  status: 'need_info' | 'ready' | 'out_of_scope'
  assistantResponse: string
  intent:
    | {
        action: 'set_primary_name'
        chainId: number
        contractAddress: `0x${string}`
        ensName: string
      }
    | {
        action: 'namespace_lookup'
        toolName:
          | 'ens_ns_get_profile_details'
          | 'ens_ns_get_names_for_address'
          | 'ens_ns_get_subnames_for_name'
          | 'ens_ns_get_name_history'
          | 'ens_ns_get_subgraph_records'
          | 'ens_ns_is_name_available'
          | 'ens_ns_get_name_price'
        arguments: Record<string, unknown>
      }
    | {
        action: 'namespace_lookup_multi'
        calls: Array<{
          toolName:
            | 'ens_ns_get_profile_details'
            | 'ens_ns_get_names_for_address'
            | 'ens_ns_get_subnames_for_name'
            | 'ens_ns_get_name_history'
            | 'ens_ns_get_subgraph_records'
            | 'ens_ns_is_name_available'
            | 'ens_ns_get_name_price'
          arguments: Record<string, unknown>
        }>
      }
    | null
}

type IntentConversationMessage = {
  role: 'user' | 'assistant'
  text: string
}

type ExamplePrompt = {
  prompt: string
}

const TESTED_EXAMPLE_PROMPTS: ExamplePrompt[] = [
  {
    prompt: 'Who owns vitalik.eth?',
  },
  {
    prompt: 'What is the resolver and expiry date of vitalik.eth?',
  },
  {
    prompt: 'Give me the ETH address and Twitter handle for vitalik.eth.',
  },
  {
    prompt:
      'What ENS names are owned by 0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045?',
  },
  {
    prompt: 'What are the subnames under vitalik.eth?',
  },
  {
    prompt: 'When was the last time vitalik.eth changed its content hash?',
  },
  {
    prompt:
      'Set mcptest8.abhi.eth to my contract 0x22D99F173af4Eb8a5909dd6E9319816531bB097b on sepolia',
  },
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
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

async function callIntentModel(
  prompt: string,
  messages: IntentConversationMessage[],
): Promise<IntentModelResponse> {
  const response = await fetch('/api/ai-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, messages }),
  })

  const json = (await response.json()) as
    | IntentModelResponse
    | { error?: string }

  if (!response.ok) {
    throw new Error(
      'error' in json && typeof json.error === 'string'
        ? json.error
        : `Intent request failed (${response.status}).`,
    )
  }

  if (
    !('model' in json) ||
    typeof json.model !== 'string' ||
    !('status' in json) ||
    (json.status !== 'need_info' &&
      json.status !== 'ready' &&
      json.status !== 'out_of_scope') ||
    !('assistantResponse' in json) ||
    typeof json.assistantResponse !== 'string' ||
    !('intent' in json)
  ) {
    throw new Error('Intent service returned invalid response.')
  }

  return json
}

function formatTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function toPromptParamsFromIntent(args: {
  intent: Extract<
    NonNullable<IntentModelResponse['intent']>,
    { action: 'set_primary_name' }
  >
  walletAddress: `0x${string}`
}): PromptParams {
  const { intent, walletAddress } = args

  if (intent.action !== 'set_primary_name') {
    throw new Error(`Unsupported intent action: ${intent.action}`)
  }
  if (!CONTRACTS[intent.chainId]) {
    throw new Error(`Unsupported chainId: ${intent.chainId}`)
  }
  if (!isAddress(intent.contractAddress)) {
    throw new Error('Intent returned invalid contract address.')
  }

  const normalizedEnsName = intent.ensName.trim().toLowerCase().replace(/\.$/, '')
  if (!normalizedEnsName.includes('.')) {
    throw new Error('Intent returned invalid ENS name.')
  }

  return {
    chainId: intent.chainId,
    contractAddress: intent.contractAddress,
    walletAddress,
    ensName: normalizedEnsName,
  }
}

function formatMultiLookupOutput(
  results: Array<{ toolName: string; payload: unknown }>,
): string {
  return results
    .map((result, index) => {
      const label = `Result ${index + 1}/${results.length}`
      return `${label}\n${formatNamespaceLookupMessage(result.toolName, result.payload)}`
    })
    .join('\n\n')
}

export default function AIPage() {
  const [prompt, setPrompt] = useState('')
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Start asking',
    },
  ])
  const [pendingApproval, setPendingApproval] = useState<PendingApproval | null>(
    null,
  )
  const [executionStatus, setExecutionStatus] = useState<StatusOutput | null>(
    null,
  )
  const [intentConversation, setIntentConversation] = useState<
    IntentConversationMessage[]
  >([])
  const [isInterpreting, setIsInterpreting] = useState(false)
  const [isPlanning, setIsPlanning] = useState(false)
  const [isExecuting, setIsExecuting] = useState(false)

  const { address: connectedWallet, chain } = useAccount()
  const { data: walletClient } = useWalletClient()
  const { switchChain } = useSwitchChain()

  const sendDisabled = useMemo(() => {
    return (
      !prompt.trim() ||
      isInterpreting ||
      isPlanning ||
      isExecuting
    )
  }, [prompt, isInterpreting, isPlanning, isExecuting])

  function appendMessage(role: ChatMessage['role'], text: string) {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`
    setMessages((prev) => [...prev, { id, role, text }])
  }

  function resizePromptTextarea() {
    const textarea = promptTextareaRef.current
    if (!textarea) return

    textarea.style.height = '0px'
    textarea.style.height = `${textarea.scrollHeight}px`
  }

  function focusPromptTextarea() {
    const textarea = promptTextareaRef.current
    if (!textarea) return
    textarea.focus()
    const len = textarea.value.length
    textarea.setSelectionRange(len, len)
  }

  useEffect(() => {
    resizePromptTextarea()
  }, [prompt])

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      focusPromptTextarea()
    })

    return () => window.cancelAnimationFrame(frame)
  }, [])

  async function handleSendPrompt() {
    const trimmed = prompt.trim()
    if (!trimmed) return

    setPrompt('')
    appendMessage('user', trimmed)
    setExecutionStatus(null)

    setIsInterpreting(true)
    appendMessage('assistant', 'Thinking...')
    let resolvedIntent: NonNullable<IntentModelResponse['intent']> | null = null
    try {
      const intentResponse = await callIntentModel(trimmed, intentConversation)
      appendMessage('assistant', intentResponse.assistantResponse)

      const nextIntentConversation: IntentConversationMessage[] = [
        ...intentConversation,
        { role: 'user', text: trimmed },
        {
          role: 'assistant',
          text: intentResponse.assistantResponse,
        },
      ]
      setIntentConversation(nextIntentConversation)

      if (intentResponse.status !== 'ready') {
        return
      }

      if (!intentResponse.intent) {
        appendMessage(
          'assistant',
          'Intent model marked this as ready but did not return a valid intent.',
        )
        return
      }

      resolvedIntent = intentResponse.intent
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Intent model request failed.'
      appendMessage(
        'assistant',
        `Intent model unavailable: ${message}.`,
      )
      return
    } finally {
      setIsInterpreting(false)
    }

    if (!resolvedIntent) {
      appendMessage(
        'assistant',
        'Unable to build a valid intent for MCP planning.',
      )
      return
    }

    if (resolvedIntent.action === 'namespace_lookup') {
      setIsPlanning(true)
      appendMessage('assistant', 'Running ENS lookup...')
      try {
        const lookup = await callMcpTool<Record<string, unknown>>(
          resolvedIntent.toolName,
          resolvedIntent.arguments,
        )
        appendMessage(
          'assistant',
          formatNamespaceLookupMessage(resolvedIntent.toolName, lookup),
        )
        setIntentConversation([])
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Lookup failed.'
        appendMessage('assistant', `Lookup failed: ${message}`)
      } finally {
        setIsPlanning(false)
      }
      return
    }

    if (resolvedIntent.action === 'namespace_lookup_multi') {
      setIsPlanning(true)
      appendMessage('assistant', 'Running ENS lookups...')
      try {
        const results: Array<{ toolName: string; payload: unknown }> = []
        for (const call of resolvedIntent.calls) {
          const payload = await callMcpTool<unknown>(call.toolName, call.arguments)
          results.push({ toolName: call.toolName, payload })
        }
        appendMessage('assistant', formatMultiLookupOutput(results))
        setIntentConversation([])
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Lookup failed.'
        appendMessage('assistant', `Lookup failed: ${message}`)
      } finally {
        setIsPlanning(false)
      }
      return
    }

    if (!connectedWallet) {
      appendMessage(
        'assistant',
        'Connect your wallet first. Naming flows require an active wallet connection.',
      )
      return
    }

    let parsed: PromptParams | null = null
    try {
      parsed = toPromptParamsFromIntent({
        intent: resolvedIntent,
        walletAddress: connectedWallet as `0x${string}`,
      })
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Intent validation failed.'
      appendMessage('assistant', `Intent validation failed: ${message}`)
    }

    if (!parsed) {
      appendMessage(
        'assistant',
        'Unable to build a valid intent for MCP planning.',
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
      setIntentConversation([])

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

  function handlePromptKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key !== 'Enter') return
    if (event.shiftKey) return
    if (event.nativeEvent.isComposing) return

    event.preventDefault()
    if (sendDisabled) return

    void handleSendPrompt()
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
            Ask for ENS lookups or primary naming. Wallet connection is only
            required for write actions.
          </p>

          <div className="rounded-lg border bg-background/50 p-3">
            <div className="text-sm font-medium text-foreground">
              Example Prompts
            </div>
            <div className="mt-1 text-xs text-muted-foreground">
              Click any prompt to insert it into the chat box.
            </div>
            <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
              {TESTED_EXAMPLE_PROMPTS.map((example) => (
                <button
                  key={example.prompt}
                  type="button"
                  className="rounded-md border bg-card px-3 py-2 text-left transition-colors hover:bg-muted"
                  onClick={() => {
                    setPrompt(example.prompt)
                    window.requestAnimationFrame(() => {
                      focusPromptTextarea()
                    })
                  }}
                  disabled={isInterpreting || isPlanning || isExecuting}
                >
                  <div className="text-xs text-muted-foreground">
                    {example.prompt}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`max-w-[90%] text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'ml-auto rounded-lg px-3 py-2 bg-primary text-primary-foreground'
                    : 'text-foreground'
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
          <div>
            <Textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                e.currentTarget.style.height = '0px'
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
              }}
              className="min-h-[40px] resize-none overflow-hidden"
              disabled={isPlanning || isExecuting}
              onKeyDown={handlePromptKeyDown}
            />
          </div>
        </div>
      </div>
    </Layout>
  )
}
