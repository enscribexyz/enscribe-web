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
import {
  normalizeIntentResponse,
  type IntentResponse,
} from '@/lib/ai/intentParser'
import { tryFormatJsonText } from '@/lib/ai/structuredDataFormatter'
import { parseAndValidateBatchCsv, type BatchCsvIssue } from '@/lib/batchNaming'
import { Plus, X } from 'lucide-react'

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
  value: `0x${string}`
  description: string
  method: string
}

type BuildPlanOutput = {
  operationId: string
  chainId: number
  plan: PlanStep[]
  isNoop?: boolean
  notes?: string[]
}

type BatchBuildPlanOutput = BuildPlanOutput & {
  parentName: string
  entryCount: number
  batchCount: number
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

type BatchPreflightOutput = {
  canProceed: boolean
  parentName?: string
  issues?: BatchCsvIssue[]
  warnings?: string[]
  validEntries?: number
  batchCount?: number
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
  mode: 'primary' | 'batch'
  params: {
    chainId: number
    walletAddress: `0x${string}`
    contractAddress?: `0x${string}`
    ensName?: string
    parentName?: string
  }
  preflight: PreflightOutput | BatchPreflightOutput
  plan: BuildPlanOutput | BatchBuildPlanOutput
}

type IntentModelResponse = IntentResponse & {
  model: string
}

type IntentConversationMessage = {
  role: 'user' | 'assistant'
  text: string
}

type IntentAttachmentContext = {
  hasCsvAttachment: boolean
  csvRowCount?: number
  csvIssueCount?: number
  inferredParentName?: string
}

type ExamplePrompt = {
  prompt: string
}

type CsvAttachment = {
  name: string
  size: number
  text: string
  inferredParentName?: string
  issues: BatchCsvIssue[]
  totalRows: number
  validRows: number
}

type ParsedKeyValueLine = {
  indent: string
  key: string
  value: string
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
  {
    prompt: 'Name all the contracts in the CSV file on sepolia',
  },
]

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function formatTxHash(hash: string): string {
  return `${hash.slice(0, 10)}...${hash.slice(-8)}`
}

function isCsvFile(file: File): boolean {
  const lowerName = file.name.toLowerCase()
  if (lowerName.endsWith('.csv')) {
    return true
  }

  return file.type === 'text/csv' || file.type === 'application/vnd.ms-excel'
}

function summarizeCsvIssues(issues: BatchCsvIssue[], maxItems = 5): string {
  if (issues.length === 0) {
    return ''
  }

  const lines = issues.slice(0, maxItems).map((issue) => {
    const rowPrefix = issue.rowNumber > 0 ? `Row ${issue.rowNumber}` : 'CSV'
    return `${rowPrefix}: ${issue.message}`
  })

  if (issues.length > maxItems) {
    lines.push(`...and ${issues.length - maxItems} more issue(s).`)
  }

  return lines.join('\n')
}

function parseKeyValueLine(line: string): ParsedKeyValueLine | null {
  const trimmed = line.trim()
  if (!trimmed || trimmed.startsWith('- ') || /^\[.*\]$/.test(trimmed)) {
    return null
  }

  const match = line.match(/^(\s*)([^:\n][^:\n]*?):(?:\s(.*))?$/)
  if (!match) {
    return null
  }

  return {
    indent: match[1] || '',
    key: match[2].trim(),
    value: match[3] ?? '',
  }
}

function isLikelyStructuredKeyValue(text: string): boolean {
  const lines = text.split('\n')
  let keyValueCount = 0
  let indentedCount = 0

  for (const line of lines) {
    const parsed = parseKeyValueLine(line)
    if (!parsed) {
      continue
    }

    keyValueCount += 1
    if (parsed.indent.length > 0) {
      indentedCount += 1
    }
  }

  return keyValueCount >= 2 || (keyValueCount === 1 && indentedCount === 1)
}

function renderStructuredKeyValueText(text: string): React.ReactNode {
  const lines = text.split('\n')
  return (
    <>
      {lines.map((line, index) => {
        const parsed = parseKeyValueLine(line)
        const isLastLine = index === lines.length - 1

        if (!parsed) {
          return (
            <React.Fragment key={`${index}-${line}`}>
              {line}
              {!isLastLine ? '\n' : ''}
            </React.Fragment>
          )
        }

        return (
          <React.Fragment key={`${index}-${parsed.key}`}>
            {parsed.indent}
            <span className="font-semibold">{parsed.key}:</span>
            {parsed.value ? ` ${parsed.value}` : ''}
            {!isLastLine ? '\n' : ''}
          </React.Fragment>
        )
      })}
    </>
  )
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
  attachmentContext: IntentAttachmentContext,
): Promise<IntentModelResponse> {
  const response = await fetch('/api/ai-intent', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, messages, attachmentContext }),
  })

  const json = (await response.json()) as Record<string, unknown>

  if (!response.ok) {
    throw new Error(
      'error' in json && typeof json.error === 'string'
        ? json.error
        : `Intent request failed (${response.status}).`,
    )
  }

  if (typeof json.model !== 'string') {
    throw new Error('Intent service returned invalid response.')
  }

  const normalized = normalizeIntentResponse(json)

  return {
    model: json.model,
    ...normalized,
  }
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

function inferChainIdForBatchPrompt(prompt: string, fallbackChainId?: number): number | null {
  const lower = prompt.toLowerCase()
  if (lower.includes('sepolia')) {
    return 11155111
  }
  if (lower.includes('mainnet') || lower.includes('ethereum')) {
    return 1
  }
  if (fallbackChainId && CONTRACTS[fallbackChainId]) {
    return fallbackChainId
  }
  return null
}

export default function AIPage() {
  const [prompt, setPrompt] = useState('')
  const [csvAttachment, setCsvAttachment] = useState<CsvAttachment | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const promptTextareaRef = useRef<HTMLTextAreaElement | null>(null)
  const csvInputRef = useRef<HTMLInputElement | null>(null)
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
    return !prompt.trim() || isInterpreting || isPlanning || isExecuting
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

  async function attachCsvFile(file: File) {
    if (!isCsvFile(file)) {
      appendMessage('assistant', 'Only CSV files are supported for batch naming.')
      return
    }

    const text = await file.text()
    const parsed = parseAndValidateBatchCsv({ csvText: text, idPrefix: 'ai-csv' })
    const validRows = parsed.entries.filter(
      (entry) => !entry.addressError && !entry.labelError,
    ).length

    setCsvAttachment({
      name: file.name,
      size: file.size,
      text,
      issues: parsed.issues,
      inferredParentName: parsed.inferredParentName,
      totalRows: parsed.entries.length,
      validRows,
    })

    if (parsed.issues.length > 0) {
      appendMessage(
        'assistant',
        `Attached ${file.name} with validation issues.\n${summarizeCsvIssues(parsed.issues)}`,
      )
      return
    }

    appendMessage(
      'assistant',
      `Attached ${file.name} (${validRows} valid row${validRows === 1 ? '' : 's'}).`,
    )
  }

  function clearCsvAttachment() {
    setCsvAttachment(null)
    if (csvInputRef.current) {
      csvInputRef.current.value = ''
    }
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
      const intentResponse = await callIntentModel(trimmed, intentConversation, {
        hasCsvAttachment: Boolean(csvAttachment),
        csvRowCount: csvAttachment?.totalRows,
        csvIssueCount: csvAttachment?.issues.length,
        inferredParentName: csvAttachment?.inferredParentName,
      })
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
        if (
          intentResponse.status === 'out_of_scope' &&
          csvAttachment &&
          /csv|file|spreadsheet/i.test(trimmed) &&
          /name|naming|set/i.test(trimmed)
        ) {
          const inferredChainId = inferChainIdForBatchPrompt(trimmed, chain?.id)
          if (inferredChainId) {
            resolvedIntent = {
              action: 'set_batch_names_from_csv',
              chainId: inferredChainId,
            }
            appendMessage(
              'assistant',
              `Using CSV batch naming intent on chain ${inferredChainId}.`,
            )
            setIntentConversation([])
          } else {
            return
          }
        } else {
          return
        }
      }

      if (!intentResponse.intent) {
        if (intentResponse.responseType === 'answer') {
          return
        }

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
      appendMessage('assistant', `Intent model unavailable: ${message}.`)
      return
    } finally {
      setIsInterpreting(false)
    }

    if (!resolvedIntent) {
      appendMessage('assistant', 'Unable to build a valid intent for MCP planning.')
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

    if (resolvedIntent.action === 'set_batch_names_from_csv') {
      if (!csvAttachment) {
        appendMessage(
          'assistant',
          'Attach a CSV file first using the + button or drag-and-drop.',
        )
        return
      }

      if (csvAttachment.issues.length > 0) {
        appendMessage(
          'assistant',
          `CSV has validation errors.\n${summarizeCsvIssues(csvAttachment.issues)}`,
        )
        return
      }

      setIsPlanning(true)
      appendMessage('assistant', 'Running batch preflight checks...')

      try {
        const inferredChainId = inferChainIdForBatchPrompt(trimmed, chain?.id)
        const batchChainId = inferredChainId ?? resolvedIntent.chainId
        if (inferredChainId && inferredChainId !== resolvedIntent.chainId) {
          appendMessage(
            'assistant',
            `Using ${getChainName(inferredChainId) || `chain ${inferredChainId}`} based on your prompt.`,
          )
        }
        if (!CONTRACTS[batchChainId]) {
          throw new Error(`Unsupported chainId for batch naming: ${batchChainId}`)
        }

        const batchArgs = {
          chainId: batchChainId,
          walletAddress: connectedWallet,
          csvText: csvAttachment.text,
          parentName: csvAttachment.inferredParentName,
        }

        const preflight = await callMcpTool<BatchPreflightOutput>(
          'ens_preflight_batch_naming_from_csv',
          batchArgs,
        )

        if (!preflight.canProceed) {
          appendMessage(
            'assistant',
            `Batch preflight failed.\n${summarizeCsvIssues(preflight.issues || [])}`,
          )
          return
        }

        appendMessage('assistant', 'Building batch transaction plan...')

        const plan = await callMcpTool<BatchBuildPlanOutput>(
          'ens_build_batch_naming_tx_plan',
          batchArgs,
        )

        setPendingApproval({
          mode: 'batch',
          params: {
            chainId: batchChainId,
            walletAddress: connectedWallet as `0x${string}`,
            parentName: preflight.parentName,
          },
          preflight,
          plan,
        })
        setIntentConversation([])

        appendMessage(
          'assistant',
          plan.isNoop
            ? 'No on-chain writes are required for this CSV.'
            : `Batch plan ready with ${plan.plan.length} transaction(s). Review and approve below.`,
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Failed to plan.'
        appendMessage('assistant', `Planning failed: ${message}`)
      } finally {
        setIsPlanning(false)
      }

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
      appendMessage('assistant', 'Unable to build a valid intent for MCP planning.')
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

      setPendingApproval({
        mode: 'primary',
        params: parsed,
        preflight,
        plan,
      })
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
    const txHashesByChain = new Map<number, string[]>()
    const completedStepIds = new Set<string>()
    let activeStepId: string | null = null

    const executePlanStep = async (step: PlanStep): Promise<string> => {
      const connectedChainId = await walletClient.getChainId()
      if (connectedChainId !== step.chainId) {
        appendMessage(
          'assistant',
          `Switching wallet to ${getChainName(step.chainId) || `chain ${step.chainId}`}`,
        )

        await waitForChainSwitch(
          walletClient,
          switchChain,
          step.chainId,
          getChainName(step.chainId) || `chain ${step.chainId}`,
        )
      }

      const publicClient = getPublicClient(step.chainId)
      if (!publicClient) {
        throw new Error(`No RPC client available for chain ${step.chainId}.`)
      }

      const txValue = BigInt(step.value)
      appendMessage('assistant', `Awaiting wallet signature: ${step.description}`)

      const estimatedGas = await publicClient.estimateGas({
        account: connectedWallet,
        to: step.to,
        data: step.data,
        value: txValue,
      })
      const bufferedGas = (estimatedGas * 12n) / 10n

      const txHash = await sendTransaction(walletClient, {
        account: connectedWallet,
        chain: getViemChain(step.chainId),
        to: step.to,
        data: step.data,
        value: txValue,
        gas: bufferedGas,
      })

      appendMessage(
        'assistant',
        `Transaction submitted (${step.method}): ${formatTxHash(txHash)}`,
      )

      const receipt = await waitForTransactionReceipt(publicClient, {
        hash: txHash,
      })
      if (receipt.status !== 'success') {
        throw new Error(`Transaction reverted (${step.method}) after submission: ${txHash}`)
      }
      appendMessage(
        'assistant',
        `Transaction confirmed (${step.method}) in block ${receipt.blockNumber.toString()}.`,
      )

      return txHash
    }

    try {
      for (const step of pendingApproval.plan.plan) {
        activeStepId = step.id
        const txHash = await executePlanStep(step)
        activeStepId = null

        const existing = txHashesByChain.get(step.chainId) ?? []
        txHashesByChain.set(step.chainId, [...existing, txHash])
        completedStepIds.add(step.id)
      }

      appendMessage('assistant', 'Tracking confirmations and ENS verification...')

      const baseChainId = pendingApproval.params.chainId
      const baseChainTxs = txHashesByChain.get(baseChainId) ?? []
      let finalStatus: StatusOutput | null = null

      if (baseChainTxs.length > 0) {
        for (let attempt = 0; attempt < 24; attempt++) {
          const status = await callMcpTool<StatusOutput>(
            'ens_get_primary_name_status',
            {
              chainId: baseChainId,
              txHashes: baseChainTxs,
              ...(pendingApproval.mode === 'primary'
                ? {
                    contractAddress: pendingApproval.params.contractAddress,
                    ensName: pendingApproval.params.ensName,
                  }
                : {}),
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
      }

      const endedAs = finalStatus?.summary?.status
      if (endedAs === 'completed') {
        appendMessage(
          'assistant',
          pendingApproval.mode === 'primary'
            ? 'Primary naming flow completed successfully.'
            : 'Batch naming flow completed successfully.',
        )
      } else if (endedAs === 'failed') {
        appendMessage(
          'assistant',
          pendingApproval.mode === 'primary'
            ? 'Primary naming flow failed on-chain. Check the status panel for details.'
            : 'Batch naming flow failed on-chain. Check the status panel for details.',
        )
      } else {
        appendMessage(
          'assistant',
          'Transactions submitted. Confirmation is still pending. You can retry status checks.',
        )
      }

      if (pendingApproval.mode === 'batch' && endedAs !== 'failed') {
        clearCsvAttachment()
      }

      setPendingApproval(null)
    } catch (error) {
      if (pendingApproval.mode === 'batch') {
        const revokeStep = pendingApproval.plan.plan.find(
          (step) => step.id === 'revoke-operator-access',
        )
        if (
          revokeStep &&
          !completedStepIds.has(revokeStep.id) &&
          activeStepId !== revokeStep.id
        ) {
          appendMessage(
            'assistant',
            'A batch step failed. Attempting operator-access revoke cleanup...',
          )
          try {
            const cleanupHash = await executePlanStep(revokeStep)
            const existing = txHashesByChain.get(revokeStep.chainId) ?? []
            txHashesByChain.set(revokeStep.chainId, [...existing, cleanupHash])
            completedStepIds.add(revokeStep.id)
            appendMessage(
              'assistant',
              `Cleanup succeeded. Operator access revoke tx: ${formatTxHash(cleanupHash)}`,
            )
          } catch (cleanupError) {
            const cleanupMessage =
              cleanupError instanceof Error
                ? cleanupError.message
                : 'Unknown cleanup error.'
            appendMessage('assistant', `Cleanup revoke failed: ${cleanupMessage}`)
          }
        }
      }

      const message = error instanceof Error ? error.message : 'Execution failed.'
      appendMessage('assistant', `Execution failed: ${message}`)
    } finally {
      setIsExecuting(false)
    }
  }

  const pendingWarnings = pendingApproval
    ? ((pendingApproval.preflight as { warnings?: string[] }).warnings ?? [])
    : []

  const pendingIssues = pendingApproval
    ? ((pendingApproval.preflight as { issues?: BatchCsvIssue[] }).issues ?? [])
    : []

  return (
    <Layout>
      <div className="flex flex-col h-[calc(100vh-9rem)]">
        <div className="flex-1 overflow-y-auto rounded-lg border bg-card p-6 space-y-3">
          <h1 className="text-2xl font-semibold text-foreground">AI</h1>
          <p className="text-sm text-muted-foreground">
            Ask for ENS lookups, single-name actions, or batch naming from a CSV attachment.
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
            {messages.map((msg) => {
              const formattedText =
                msg.role === 'assistant'
                  ? tryFormatJsonText(msg.text) ?? msg.text
                  : msg.text
              const shouldRenderKeyValue =
                msg.role === 'assistant' && isLikelyStructuredKeyValue(formattedText)

              return (
                <div
                  key={msg.id}
                  className={`max-w-[90%] text-sm whitespace-pre-wrap ${
                    msg.role === 'user'
                      ? 'ml-auto rounded-lg px-3 py-2 bg-primary text-primary-foreground'
                      : 'text-foreground'
                  }`}
                >
                  {shouldRenderKeyValue
                    ? renderStructuredKeyValueText(formattedText)
                    : formattedText}
                </div>
              )
            })}
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
                  {pendingApproval.mode === 'primary' && pendingApproval.params.ensName && (
                    <Badge variant="secondary">{pendingApproval.params.ensName}</Badge>
                  )}
                  {pendingApproval.mode === 'batch' && (
                    <Badge variant="secondary">
                      {(pendingApproval.plan as BatchBuildPlanOutput).parentName || 'CSV Batch'}
                    </Badge>
                  )}
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

                {pendingWarnings.length > 0 && (
                  <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-700 dark:text-amber-300">
                    {pendingWarnings.join(' ')}
                  </div>
                )}

                {pendingIssues.length > 0 && (
                  <div className="rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
                    {summarizeCsvIssues(pendingIssues)}
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
          <input
            ref={csvInputRef}
            type="file"
            accept=".csv,text/csv"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0]
              if (!file) {
                return
              }
              void attachCsvFile(file)
            }}
          />

          {csvAttachment && (
            <div className="mb-2 flex items-center justify-between rounded-md border bg-background px-3 py-2 text-xs">
              <div className="truncate">
                <span className="font-medium">CSV:</span> {csvAttachment.name} ({csvAttachment.validRows} valid row{csvAttachment.validRows === 1 ? '' : 's'})
              </div>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={clearCsvAttachment}
                className="h-6 w-6"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          )}

          {csvAttachment && csvAttachment.issues.length > 0 && (
            <div className="mb-2 rounded-md border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-700 dark:text-red-300 whitespace-pre-wrap">
              {summarizeCsvIssues(csvAttachment.issues)}
            </div>
          )}

          <div
            className={`flex items-end gap-2 rounded-md border p-2 transition-colors ${
              isDragActive ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-900/20' : 'border-transparent'
            }`}
            onDragEnter={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragActive(true)
            }}
            onDragOver={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragActive(true)
            }}
            onDragLeave={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragActive(false)
            }}
            onDrop={(event) => {
              event.preventDefault()
              event.stopPropagation()
              setIsDragActive(false)

              const file = event.dataTransfer.files?.[0]
              if (!file) {
                return
              }
              void attachCsvFile(file)
            }}
          >
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => csvInputRef.current?.click()}
              disabled={isPlanning || isExecuting}
              aria-label="Attach CSV"
            >
              <Plus className="h-4 w-4" />
            </Button>

            <Textarea
              ref={promptTextareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value)
                e.currentTarget.style.height = '0px'
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`
              }}
              className="min-h-[40px] resize-none overflow-hidden border-0 p-0 shadow-none focus-visible:ring-0"
              disabled={isPlanning || isExecuting}
              onKeyDown={handlePromptKeyDown}
            />

            <Button
              type="button"
              onClick={() => {
                if (!sendDisabled) {
                  void handleSendPrompt()
                }
              }}
              disabled={sendDisabled}
              className="shrink-0"
            >
              Send
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Drop a CSV onto the input or click + to attach. Use Enter to send, Shift+Enter for a new line.
          </p>
        </div>
      </div>
    </Layout>
  )
}
