import React, { memo } from 'react'
import Link from 'next/link'
import { CheckCircle2, XCircle } from 'lucide-react'

interface ContractStatusPanelProps {
  isAddressEmpty: boolean
  isContractOwner: boolean | null
  isOwnable: boolean | null
  isReverseClaimable: boolean | null
  isOwnableOptimism: boolean | null
  isOwnableArbitrum: boolean | null
  isOwnableScroll: boolean | null
  isOwnableBase: boolean | null
  isOwnableLinea: boolean | null
  chainName: string | undefined
}

export const ContractStatusPanel = memo(function ContractStatusPanel({
  isAddressEmpty,
  isContractOwner,
  isOwnable,
  isReverseClaimable,
  isOwnableOptimism,
  isOwnableArbitrum,
  isOwnableScroll,
  isOwnableBase,
  isOwnableLinea,
  chainName,
}: ContractStatusPanelProps) {
  const showPanel =
    (!isAddressEmpty && !isContractOwner) ||
    isOwnable ||
    (isReverseClaimable && !isOwnable)

  if (!showPanel) return null

  return (
    <div className="flex flex-col space-y-1 mt-4">
      {!isAddressEmpty && !isContractOwner && isOwnable && (
        <div className="flex items-center">
          <XCircle className="w-5 h-5 inline text-red-500 cursor-pointer" />
          <p className="text-gray-600 inline ml-1 dark:text-gray-300">
            {chainName}: You are not the contract owner and cannot set its
            primary name
          </p>
        </div>
      )}
      {(isOwnable || (isReverseClaimable && !isOwnable)) && (
        <div className="space-y-1">
          {isOwnable && (
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-1" />
              <p className="text-gray-700 dark:text-gray-200">
                {chainName}: Contract implements{' '}
                <Link
                  href="https://docs.openzeppelin.com/contracts/access-control#ownership-and-ownable"
                  className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  Ownable
                </Link>
              </p>
            </div>
          )}
          {isReverseClaimable && !isOwnable && (
            <div className="flex items-center">
              <CheckCircle2 className="w-5 h-5 text-green-500 mr-1" />
              <p className="text-gray-700 dark:text-gray-200">
                {chainName}: Contract is{' '}
                <Link
                  href="https://docs.ens.domains/web/naming-contracts#reverseclaimersol"
                  className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
                >
                  ReverseClaimable
                </Link>
              </p>
            </div>
          )}
        </div>
      )}

      {/* L2 Ownable Information */}
      {!isAddressEmpty && (
        <div className="space-y-1">
          {isOwnableOptimism === true && (
            <OwnableRow network="Optimism" />
          )}
          {isOwnableArbitrum === true && (
            <OwnableRow network="Arbitrum" />
          )}
          {isOwnableScroll === true && (
            <OwnableRow network="Scroll" />
          )}
          {isOwnableBase === true && (
            <OwnableRow network="Base" />
          )}
          {isOwnableLinea === true && (
            <OwnableRow network="Linea" />
          )}
        </div>
      )}
    </div>
  )
})

function OwnableRow({ network }: { network: string }) {
  return (
    <div className="flex items-center">
      <CheckCircle2 className="w-5 h-5 text-green-500 mr-1" />
      <p className="text-gray-700 dark:text-gray-200">
        Contract implements{' '}
        <Link
          href="https://docs.openzeppelin.com/contracts/access-control#ownership-and-ownable"
          className="text-blue-600 hover:underline dark:text-blue-400 dark:hover:text-blue-300"
        >
          Ownable
        </Link>{' '}
        on {network}
      </p>
    </div>
  )
}
