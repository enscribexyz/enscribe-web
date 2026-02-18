import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { useAccount, useChainId, useWalletClient } from 'wagmi'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  CONTRACTS,
  TOPIC0,
  CHAINS,
  SOURCIFY_URL,
  ETHERSCAN_API,
} from '../utils/constants'
import ensRegistryABI from '../contracts/ENSRegistry'
import { CircleAlert, Info, ShieldCheck } from 'lucide-react'
import { getEnsName, namehash } from 'viem/ens'
import { readContract, waitForTransactionReceipt } from 'viem/actions'
import type { Address } from 'viem'
import { getDeployedAddress } from '@/components/componentUtils'
import { ethers } from 'ethers'
import reverseRegistrarABI from '../contracts/ReverseRegistrar'
import publicResolverABI from '../contracts/PublicResolver'
import { getENS } from '@/utils/ens'
import type { ContractRecord } from '@/types'

type Contract = ContractRecord

export default function ContractHistory() {
  const { address: walletAddress, isConnected, chain } = useAccount()
  const chainId = useChainId()

  const { data: walletClient } = useWalletClient()
  const config = chainId ? CONTRACTS[chainId] : undefined

  const [withENS, setWithENS] = useState<Contract[]>([])
  const [withoutENS, setWithoutENS] = useState<Contract[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(true)

  const [pageWith, setPageWith] = useState(1)
  const [pageWithout, setPageWithout] = useState(1)
  const itemsPerPage = 10

  const etherscanApi = `${ETHERSCAN_API}&chainid=${chainId}&module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=999999999999&sort=asc`
  const etherscanUrl = config!.ETHERSCAN_URL
  const blockscoutUrl = config!.BLOCKSCOUT_URL
  const chainlensUrl = config!.CHAINLENS_URL
  const ensAppUrl = config!.ENS_APP_URL
  const topic0 = TOPIC0

  useEffect(() => {
    // if (!isConnected || !walletAddress || !walletClient) return
    console.log(`use effect called, chain: ${chainId}`)
    const controller = new AbortController()
    const signal = controller.signal
    let isMounted = true

    const fetchTxs = async () => {
      setLoading(true)
      setError(null)
      setWithENS([])
      setWithoutENS([])

      try {
        // const url = `${etherscanApi}&action=txlist&address=${address}`

        console.log('etherscan api - ', etherscanApi)
        const res = await fetch(etherscanApi, { signal })
        const data = await res.json()

        setProcessing(true)

        for (const tx of data.result || []) {
          if (signal.aborted || !isMounted || !walletClient) {
            console.log(
              `signal aborted: ${signal.aborted}, isMounted: ${isMounted}, walletClient: ${walletClient}`,
            )
            break
          }

          const txHash = tx.hash
          let isOwnable = false

          const contractCreated = new Date(
            parseInt(tx.timeStamp) * 1000,
          ).toLocaleString()
          // const contractCreated = `${date.getDate().toString().padStart(2, '0')}/${date.toLocaleString('default', { month: 'long' })}/${date.getFullYear()}`;

          if (tx.to === '') {
            const contractAddr = tx.contractAddress

            isOwnable = await checkIfOwnable(contractAddr)
            if (!isOwnable) {
              isOwnable = await checkIfReverseClaimable(contractAddr)
            }

            const result = await getContractStatus(
              chainId,
              contractAddr,
              signal,
            )
            const sourcifyVerification = result.sourcify_verification
            const etherscanVerification = result.etherscan_verification
            const blockscoutVerification = result.blockscout_verification
            const attestation = result.audit_status
            // const ensName = result.ens_name
            const ensName = await getENS(contractAddr, chainId)

            const contract: Contract = {
              ensName,
              contractAddress: contractAddr,
              txHash,
              contractCreated,
              isOwnable,
              sourcifyVerification,
              etherscanVerification,
              blockscoutVerification,
              attestation,
            }
            // const contract: Contract = { ensName, contractAddress: contractAddr, txHash, isOwnable }
            // console.log('contract - ', contract)

            if (isMounted) {
              if (ensName) {
                console.log(`setWithENS`)
                setWithENS((prev) => {
                  const alreadyExists = prev.some(
                    (c) => c.contractAddress === contract.contractAddress,
                  )
                  return alreadyExists ? prev : [contract, ...prev]
                })
              } else {
                console.log(`setWithoutENS`)
                setWithoutENS((prev) => {
                  const alreadyExists = prev.some(
                    (c) => c.contractAddress === contract.contractAddress,
                  )
                  return alreadyExists ? prev : [contract, ...prev]
                })
              }
            } else {
              console.log('not mounted')
            }
          } else if (
            ['0xacd71554', '0x04917062', '0x7ed7e08c', '0x5a0dac49'].includes(
              tx.methodId,
            )
          ) {
            const deployed = (await extractDeployed(txHash)) || ''
            if (deployed) {
              isOwnable = await checkIfOwnable(deployed)
              if (!isOwnable) {
                isOwnable = await checkIfReverseClaimable(deployed)
              }

              const result = await getContractStatus(chainId, deployed, signal)
              const sourcifyVerification = result.sourcify_verification
              const etherscanVerification = result.etherscan_verification
              const blockscoutVerification = result.blockscout_verification
              const attestation = result.audit_status
              // const ensName = result.ens_name
              const ensName = await getENS(deployed, chainId)

              const contract: Contract = {
                ensName,
                contractAddress: deployed,
                txHash,
                contractCreated,
                isOwnable,
                sourcifyVerification,
                etherscanVerification,
                blockscoutVerification,
                attestation,
              }

              console.log('contract - ', contract)

              if (isMounted) {
                if (ensName) {
                  setWithENS((prev) => {
                    const alreadyExists = prev.some(
                      (c) => c.contractAddress === contract.contractAddress,
                    )
                    return alreadyExists ? prev : [contract, ...prev]
                  })
                } else {
                  setWithoutENS((prev) => {
                    const alreadyExists = prev.some(
                      (c) => c.contractAddress === contract.contractAddress,
                    )
                    return alreadyExists ? prev : [contract, ...prev]
                  })
                }
              }
            }
          }
        }

        setProcessing(false)
      } catch (e) {
        if (!signal.aborted) {
          setError('Failed to fetch transactions: ' + e)
        }
      } finally {
        if (isMounted) setLoading(false)
      }

      return () => {
        isMounted = false
      }
    }

    fetchTxs()

    return () => {
      isMounted = false
      controller.abort()
    }
  }, [chainId, walletClient])

  const extractDeployed = async (txHash: string): Promise<string | null> => {
    if (!walletClient) return null

    try {
      const txReceipt = await waitForTransactionReceipt(walletClient, {
        hash: txHash as `0x${string}`,
      })
      if (txReceipt) {
        const deployedContractAddress = await getDeployedAddress(txReceipt)
        if (deployedContractAddress) {
          return deployedContractAddress
        }
      }
      return null
    } catch {
      return null
    }
  }

  const checkIfOwnable = async (address: string): Promise<boolean> => {
    if (!walletClient) return false

    try {
      const ownerAddress = (await readContract(walletClient, {
        address: address as `0x${string}`,
        abi: ['function owner() view returns (address)'],
        functionName: 'owner',
        args: [],
      })) as string

      return true
    } catch (err) {
      return false
    }
  }

  const checkIfReverseClaimable = async (address: string): Promise<boolean> => {
    if (!walletClient) return false

    try {
      const addrLabel = address.slice(2).toLowerCase()
      const reversedNode = namehash(addrLabel + '.' + 'addr.reverse')
      const resolvedAddr = (await readContract(walletClient, {
        address: config?.ENS_REGISTRY as `0x${string}`,
        abi: ensRegistryABI,
        functionName: 'owner',
        args: [reversedNode],
      })) as `0x${string}`

      return resolvedAddr === walletAddress
    } catch (err) {
      console.log('err ' + err)
      return false
    }
  }

  const getContractStatus = async (
    chainId: number | undefined,
    address: string,
    signal: AbortSignal,
  ) => {
    const defaultStatus = {
      sourcify_verification: 'unverified',
      etherscan_verification: 'unverified',
      audit_status: 'unaudited',
      attestation_tx_hash: '0xabc123',
      blockscout_verification: 'unverified',
      ens_name: '',
    }

    try {
      const res = await fetch(
        `/api/v1/verification/${chainId}/${address.toLowerCase()}`,
        { signal },
      )
      if (!res.ok) return defaultStatus

      const data = await res.json()

      if (data) return data
      return defaultStatus
    } catch {
      return defaultStatus
    }
  }

  const truncate = (text: string) =>
    text.length <= 20 ? text : `${text.slice(0, 20)}...${text.slice(-3)}`

  const paginated = (list: Contract[], page: number) =>
    list.slice((page - 1) * itemsPerPage, page * itemsPerPage)

  return (
    <div className="flex flex-col space-y-2 max-h-[calc(100vh-160px)] overflow-y-auto pr-1">
      {!isConnected ? (
        <p className="text-red-500 text-lg text-center">
          Please connect your wallet
        </p>
      ) : error ? (
        <p className="text-red-500">{error}</p>
      ) : (
        <Tabs defaultValue="without-ens">
          <TabsList className="inline-flex bg-gray-100 dark:bg-gray-700 shadow-sm">
            <TabsTrigger
              value="without-ens"
              className="px-6 py-2 rounded-md text-sm font-medium transition-all bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
            >
              Unnamed Contracts
            </TabsTrigger>

            <TabsTrigger
              value="with-ens"
              className="px-6 py-2 rounded-md text-sm font-medium transition-all bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-400 data-[state=active]:bg-white dark:data-[state=active]:bg-gray-900 data-[state=active]:text-gray-900 dark:data-[state=active]:text-white"
            >
              Named Contracts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="without-ens">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Address</TableHead>
                    <TableHead>Tx Hash</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead className="text-center">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated(withoutENS, pageWithout).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${etherscanUrl}address/${c.contractAddress}`}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            {truncate(c.contractAddress)}
                          </Link>
                          {c.isOwnable ? (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Info className="w-5 h-5 inline text-green-500 ml-2 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  <p>
                                    You can set Primary Name for this contract
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          ) : (
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <CircleAlert className="w-5 h-5 inline text-amber-500 ml-2 cursor-pointer" />
                                </TooltipTrigger>
                                <TooltipContent side="top" align="center">
                                  <p>
                                    You can only set Forward Resolution for this
                                    contract
                                  </p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          )}

                          {(c.sourcifyVerification === 'exact_match' ||
                            c.sourcifyVerification === 'match') && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${SOURCIFY_URL}${chainId}/${c.contractAddress.toLowerCase()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/sourcify.svg"
                                    alt="Sourcify"
                                    className="w-4 h-4"
                                  />
                                  Verified
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.etherscanVerification === 'verified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${etherscanUrl}address/${c.contractAddress}#code`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/etherscan.svg"
                                    alt="Etherscan"
                                    className="w-4 h-4"
                                  />
                                  Verifed
                                </Link>
                              </Button>
                            </div>
                          )}
                          {(c.blockscoutVerification === 'exact_match' ||
                            c.blockscoutVerification === 'match') && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${config?.BLOCKSCOUT_URL}address/${c.contractAddress.toLowerCase()}?tab=contract`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/blockscout.svg"
                                    alt="Blockscout"
                                    className="w-4 h-4"
                                  />
                                  Verified
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.sourcifyVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`https://sourcify.dev/#/verifier`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/sourcify.svg"
                                    alt="Sourcify"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.etherscanVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${etherscanUrl}address/${c.contractAddress}#code`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/etherscan.svg"
                                    alt="Etherscan"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.blockscoutVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${config?.BLOCKSCOUT_URL}address/${c.contractAddress.toLowerCase()}?tab=contract`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/blockscout.svg"
                                    alt="Blockscout"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Link
                          href={`${etherscanUrl}tx/${c.txHash}`}
                          target="_blank"
                          className="text-blue-600 hover:underline"
                        >
                          {truncate(c.txHash)}
                        </Link>
                      </TableCell>
                      <TableCell>{c.contractCreated}</TableCell>
                      <TableCell className="flex gap-2 justify-center">
                        {c.isOwnable ? (
                          <Button asChild variant="default">
                            <Link
                              href={`/nameContract?contract=${c.contractAddress}`}
                              target="_blank"
                            >
                              Name Contract
                            </Link>
                          </Button>
                        ) : (
                          <Button asChild variant="default">
                            <Link
                              href={`/nameContract?contract=${c.contractAddress}`}
                              target="_blank"
                            >
                              Forward Resolve
                            </Link>
                          </Button>
                        )}
                        {/* <Button asChild variant="default">
                                                    <Link href={`/nameContract?contract=${c.contractAddress}`} target="_blank">
                                                        Name Contract
                                                    </Link>
                                                </Button> */}
                      </TableCell>
                    </TableRow>
                  ))}
                  {!processing && withoutENS.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-black-700 py-4"
                      >
                        No Contracts Deployed
                      </TableCell>
                    </TableRow>
                  )}

                  {processing && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <div className="w-6 h-6 mx-auto border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-center mt-4 space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setPageWithout((p) => p - 1)}
                  disabled={pageWithout === 1}
                >
                  Previous
                </Button>

                <Badge>
                  {`Page ${pageWithout} of ${Math.max(1, Math.ceil(withoutENS.length / itemsPerPage))}`}
                </Badge>

                <Button
                  variant="ghost"
                  onClick={() => setPageWithout((p) => p + 1)}
                  disabled={
                    pageWithout >= Math.ceil(withoutENS.length / itemsPerPage)
                  }
                >
                  Next
                </Button>
              </div>
            </Card>
          </TabsContent>
          <TabsContent value="with-ens">
            <Card className="p-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ENS Name</TableHead>
                    <TableHead>Address</TableHead>
                    <TableHead>Date Created</TableHead>
                    <TableHead className="text-center">View on Apps</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginated(withENS, pageWith).map((c, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${ensAppUrl}${c.ensName}`}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            {c.ensName}
                          </Link>
                          <TooltipProvider>
                            {(c.sourcifyVerification === 'exact_match' ||
                              c.sourcifyVerification === 'match' ||
                              c.etherscanVerification === 'verified' ||
                              c.blockscoutVerification === 'exact_match' ||
                              c.blockscoutVerification === 'match') &&
                              c.attestation === 'audited' && (
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <ShieldCheck className="w-5 h-5 text-green-500 cursor-pointer" />
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>Trusted - Named and Verified Contract</p>
                                  </TooltipContent>
                                </Tooltip>
                              )}
                          </TooltipProvider>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Link
                            href={`${etherscanUrl}address/${c.contractAddress}`}
                            target="_blank"
                            className="text-blue-600 hover:underline"
                          >
                            {truncate(c.contractAddress)}
                          </Link>

                          {(c.sourcifyVerification === 'exact_match' ||
                            c.sourcifyVerification === 'match') && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${SOURCIFY_URL}${chainId}/${c.contractAddress.toLowerCase()}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/sourcify.svg"
                                    alt="Sourcify"
                                    className="w-4 h-4"
                                  />
                                  Verified
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.etherscanVerification === 'verified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${etherscanUrl}address/${c.contractAddress}#code`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/etherscan.svg"
                                    alt="Etherscan"
                                    className="w-4 h-4"
                                  />
                                  Verifed
                                </Link>
                              </Button>
                            </div>
                          )}
                          {(c.blockscoutVerification === 'exact_match' ||
                            c.blockscoutVerification === 'match') && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="border border-green-800 text-green-800 hover:bg-emerald-100 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${config?.BLOCKSCOUT_URL}address/${c.contractAddress.toLowerCase()}?tab=contract`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/blockscout.svg"
                                    alt="Blockscout"
                                    className="w-4 h-4"
                                  />
                                  Verified
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.sourcifyVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`https://sourcify.dev/#/verifier`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/sourcify.svg"
                                    alt="Sourcify"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.etherscanVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${etherscanUrl}address/${c.contractAddress}#code`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                >
                                  <img
                                    src="/etherscan.svg"
                                    alt="Etherscan"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                          {c.blockscoutVerification === 'unverified' && (
                            <div className="flex items-center gap-2">
                              <Button
                                asChild
                                size="sm"
                                variant="outline"
                                className="hover:bg-gray-200 text-xs px-2 py-1 h-auto flex items-center gap-1"
                              >
                                <Link
                                  href={`${config?.BLOCKSCOUT_URL}address/${c.contractAddress.toLowerCase()}?tab=contract`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="cursor-pointer"
                                >
                                  <img
                                    src="/blockscout.svg"
                                    alt="Blockscout"
                                    className="w-4 h-4"
                                  />
                                  Verify
                                </Link>
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{c.contractCreated}</TableCell>
                      <TableCell className="flex gap-2 justify-center">
                        <Button
                          asChild
                          variant="outline"
                          className="hover:bg-gray-200"
                        >
                          <Link
                            href={`${etherscanUrl}tx/${c.txHash}`}
                            target="_blank"
                          >
                            <img
                              src="/etherscan.svg"
                              alt="Etherscan"
                              className="w-5 h-5"
                            />
                            Etherscan
                          </Link>
                        </Button>
                        {chainlensUrl ? (
                          <Button
                            asChild
                            variant="outline"
                            className="hover:bg-gray-200"
                          >
                            <Link
                              href={`${chainlensUrl}transactions/${c.txHash}`}
                              target="_blank"
                            >
                              <img
                                src="/chainlens.png"
                                alt="Chainlens"
                                className="w-5 h-5"
                              />
                              Chainlens
                            </Link>
                          </Button>
                        ) : (
                          <Button
                            asChild
                            variant="outline"
                            className="hover:bg-gray-200"
                          >
                            <Link
                              href={`${blockscoutUrl}tx/${c.txHash}`}
                              target="_blank"
                            >
                              <img
                                src="/blockscout.svg"
                                alt="Blockscout"
                                className="w-5 h-5"
                              />
                              Blockscout
                            </Link>
                          </Button>
                        )}

                        <Button
                          asChild
                          variant="outline"
                          className="hover:bg-gray-200"
                        >
                          <Link
                            href={`${ensAppUrl}${c.ensName}`}
                            target="_blank"
                          >
                            <img src="/ens.svg" alt="ENS" className="w-5 h-5" />
                            ENS App
                          </Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {!processing && withENS.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={4}
                        className="text-center text-black-700 py-4"
                      >
                        No Contracts Deployed
                      </TableCell>
                    </TableRow>
                  )}

                  {processing && (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        <div className="w-6 h-6 mx-auto border-4 border-gray-300 border-t-black rounded-full animate-spin"></div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="flex justify-center mt-4 space-x-4">
                <Button
                  variant="ghost"
                  onClick={() => setPageWith((p) => p - 1)}
                  disabled={pageWith === 1}
                >
                  Previous
                </Button>

                <Badge>
                  {`Page ${pageWith} of ${Math.max(1, Math.ceil(withENS.length / itemsPerPage))}`}
                </Badge>

                <Button
                  variant="ghost"
                  onClick={() => setPageWith((p) => p + 1)}
                  disabled={
                    pageWith >= Math.ceil(withENS.length / itemsPerPage)
                  }
                >
                  Next
                </Button>
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
