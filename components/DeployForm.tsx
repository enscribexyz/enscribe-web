import React from 'react'
import {
  useDeployForm,
  commonTypes,
  checkIfOwnable,
  checkIfReverseClaimable,
} from '@/hooks/useDeployForm'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { CheckCircle2 } from 'lucide-react'
import Link from 'next/link'
import SetNameStepsModal from './SetNameStepsModal'
import { ENSDomainPickerModal } from '@/components/naming/ENSDomainPickerModal'

export default function DeployForm() {
  const {
    isConnected,
    enscribeDomain,
    isSafeWallet,

    bytecode,
    setBytecode,
    label,
    setLabel,
    parentType,
    setParentType,
    parentName,
    setParentName,
    fetchingENS,
    deployedAddress,
    error,
    setError,
    loading,
    showENSModal,
    setShowENSModal,
    isValidBytecode,
    isOwnable,
    setIsOwnable,
    isReverseClaimable,
    setIsReverseClaimable,
    isReverseSetter,
    setIsReverseSetter,
    operatorAccess,
    setOperatorAccess,
    recordExists,
    setRecordExists,
    accessLoading,
    args,
    setArgs,
    abiText,
    setAbiText,
    modalOpen,
    setModalOpen,
    modalSteps,
    modalTitle,
    modalSubtitle,
    userOwnedDomains,
    isUnsupportedL2Chain,
    unsupportedL2Name,

    populateName,
    addArg,
    updateArg,
    removeArg,
    isEmpty,
    handleAbiInput,
    checkENSReverseResolution,
    recordExist,
    checkOperatorAccess,
    revokeOperatorAccess,
    grantOperatorAccess,
    deployContract,
    fetchUserOwnedDomains,
  } = useDeployForm()

  return (
    <div className="w-full max-w-5xl mx-auto bg-white dark:bg-gray-800 shadow-lg rounded-xl p-8 border border-gray-200 dark:border-gray-700">
      <h2 className="text-3xl font-semibold text-gray-900 dark:text-white">
        Deploy New Contract
      </h2>
      {(!isConnected || isUnsupportedL2Chain) && (
        <p className="text-red-500">
          {!isConnected
            ? 'Please connect your wallet.'
            : `Deploying Contract with Primary Name for ${unsupportedL2Name} is not currently supported`}
        </p>
      )}

      <div
        className={`space-y-6 mt-6 ${!isConnected || isUnsupportedL2Chain ? 'pointer-events-none opacity-50' : ''}`}
      >
        <label className="block text-gray-700 dark:text-gray-300">
          Bytecode
        </label>
        <Input
          type="text"
          value={bytecode}
          onChange={(e) => {
            setBytecode(e.target.value)
            setIsOwnable(checkIfOwnable(e.target.value))
            setIsReverseClaimable(checkIfReverseClaimable(e.target.value))
          }}
          onBlur={() => {
            if (bytecode && !bytecode.startsWith('0x')) {
              setBytecode('0x' + bytecode)
            }
            setIsOwnable(checkIfOwnable(bytecode))
            setIsReverseClaimable(checkIfReverseClaimable(bytecode))
          }}
          placeholder="0x60037..."
          className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200 ${
            !isValidBytecode ? 'border-red-500' : ''
          }`}
        />

        {/* Error message for invalid Ownable bytecode */}
        {!isValidBytecode && bytecode.length > 0 && (
          <p className="text-red-500">
            Invalid contract bytecode. It does not extend
            Ownable/ReverseClaimable.
          </p>
        )}

        {
          <>
            <div className="justify-between">
              {isOwnable && (
                <>
                  <CheckCircle2 className="w-5 h-5 inline text-green-500 ml-2 cursor-pointer" />
                  <p className="ml-1 text-gray-700 dark:text-gray-300 inline">
                    Contract implements{' '}
                    <Link
                      href="https://docs.openzeppelin.com/contracts/access-control#ownership-and-ownable"
                      className="text-blue-600 hover:underline"
                    >
                      Ownable
                    </Link>
                  </p>
                </>
              )}
              {isReverseClaimable && (
                <>
                  <CheckCircle2 className="w-5 h-5 inline text-green-500 ml-2 cursor-pointer" />
                  <p className="ml-1 text-gray-700 dark:text-gray-300 inline">
                    Contract is either{' '}
                    <Link
                      href="https://docs.ens.domains/web/naming-contracts#reverseclaimersol"
                      className="text-blue-600 hover:underline"
                    >
                      ReverseClaimable
                    </Link>{' '}
                    or{' '}
                    <Link
                      href="https://docs.ens.domains/web/naming-contracts/#set-a-name-in-the-constructor"
                      className="text-blue-600 hover:underline"
                    >
                      ReverseSetter
                    </Link>
                  </p>
                </>
              )}
            </div>
          </>
        }

        {isReverseClaimable && (
          <>
            <div className={'flex'}>
              <Input
                type={'checkbox'}
                className={'w-4 h-4 mt-1'}
                checked={isReverseSetter}
                onChange={() => {
                  setIsReverseSetter(!isReverseSetter)
                }}
              />
              <label className="ml-1.5 text-gray-700 dark:text-gray-300">
                My contract is a{' '}
                <Link
                  href="https://docs.ens.domains/web/naming-contracts/#set-a-name-in-the-constructor"
                  className="text-blue-600 hover:underline"
                >
                  ReverseSetter
                </Link>{' '}
                (This will deploy & set the name of the contract using different
                steps than ReverseClaimable)
              </label>
            </div>
          </>
        )}

        <label className="block text-gray-700 dark:text-gray-300 mt-6">
          Paste ABI JSON (Optional)
        </label>
        <Textarea
          rows={3}
          className="w-full border rounded-lg p-3 text-sm bg-white dark:bg-gray-700 dark:text-white text-gray-900"
          placeholder="[{'inputs':[{'internalType':'string','name':'greet','type':'string'}],'type':'constructor'}]"
          value={abiText}
          onChange={(e) => {
            const value = e.target.value
            setAbiText(value)
            handleAbiInput(value)
          }}
        />

        {/* Render dynamic constructor args */}
        <label className="block text-gray-700 dark:text-gray-300 mt-6">
          Constructor Arguments
        </label>
        {args.map((arg, index) => (
          <div key={index} className="mb-4">
            <label className="block text-gray-700 dark:text-gray-300">
              {arg.label || `Argument ${index + 1}`}
            </label>
            <div className="flex flex-col md:flex-row gap-4 items-start">
              {!arg.isCustom ? (
                <Select
                  value={arg.type}
                  onValueChange={(value) => {
                    if (value === 'custom') {
                      updateArg(index, { isCustom: true, type: '' })
                    } else {
                      updateArg(index, { type: value, isCustom: false })
                    }
                  }}
                >
                  <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500">
                    <SelectValue className="text-gray-900 dark:text-gray-200" />
                  </SelectTrigger>
                  <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md">
                    {commonTypes.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                    <SelectItem value="custom">Custom...</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  type="text"
                  value={arg.type}
                  onChange={(e) => updateArg(index, { type: e.target.value })}
                  placeholder="Enter custom type (e.g. tuple(string,uint256))"
                  className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                />
              )}

              <Input
                type="text"
                value={arg.value}
                onChange={(e) => updateArg(index, { value: e.target.value })}
                placeholder={
                  arg.type.includes('tuple') && arg.type.includes('[]')
                    ? '[["name", 10, "0x..."], ["bob", 20, "0x..."]]'
                    : arg.type.includes('tuple')
                      ? '["name", 10, "0x..."]'
                      : 'Enter value'
                }
                className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <Button
                type="button"
                onClick={() => removeArg(index)}
                variant="destructive"
                className="mt-2 md:mt-0"
              >
                Remove
              </Button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          onClick={addArg}
          className="bg-gray-900 text-white mt-3 dark:hover:bg-gray-800 dark:text-white dark:bg-blue-700"
        >
          + Add Argument
        </Button>

        <label className="block text-gray-700 dark:text-gray-300">
          Contract Name
        </label>

        <div className={'flex items-center space-x-2'}>
          <Input
            type="text"
            value={label}
            onChange={(e) => {
              setLabel(e.target.value)
              setError('')
            }}
            onBlur={checkENSReverseResolution}
            placeholder="my label"
            className="w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          />
          <Button
            onClick={populateName}
            className="relative overflow-hidden bg-gradient-to-r from-purple-500 via-pink-500 to-red-500 text-white hover:shadow-xl hover:shadow-pink-500/50 focus:ring-4 focus:ring-pink-500/50 group transition-all duration-300 hover:-translate-y-1 p-2.5 font-medium"
          >
            <span className="relative z-10 p-2">✨Generate Name</span>
            {/* Glow effect on hover */}
            <span className="absolute inset-0 h-full w-full bg-gradient-to-r from-purple-600/0 via-white/70 to-purple-600/0 opacity-0 group-hover:opacity-100 group-hover:animate-shine pointer-events-none blur-sm"></span>
            {/* Outer glow */}
            <span className="absolute -inset-1 rounded-md bg-gradient-to-r from-purple-600 via-pink-500 to-red-500 opacity-0 group-hover:opacity-70 group-hover:blur-md transition-all duration-300 pointer-events-none"></span>
          </Button>
        </div>

        <label className="block text-gray-700 dark:text-gray-300">
          ENS Parent
        </label>
        <Select
          value={parentType}
          onValueChange={(e) => {
            const selected = e as 'web3labs' | 'own'
            setParentType(selected)
            if (selected === 'web3labs') {
              setParentName(enscribeDomain)
            } else {
              setParentName('')
              fetchUserOwnedDomains()
              setShowENSModal(true)
            }
          }}
        >
          <SelectTrigger className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md p-3 focus:ring-2 focus:ring-indigo-500">
            <SelectValue className="text-gray-900 dark:text-gray-200" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-200 border border-gray-300 dark:border-gray-600 rounded-md">
            <SelectItem value="web3labs" className="focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-gray-200">
              {enscribeDomain}
            </SelectItem>
            <SelectItem value="own" className="focus:bg-gray-100 dark:focus:bg-gray-700 focus:text-gray-900 dark:focus:text-gray-200">
              Your ENS Parent
            </SelectItem>
          </SelectContent>
        </Select>
        {parentType === 'own' && (
          <>
            <label className="block text-gray-700 dark:text-gray-300">
              Parent Name
            </label>
            <div className="flex items-center gap-2">
              <Input
                type="text"
                value={parentName}
                onChange={(e) => {
                  setParentName(e.target.value)
                  setOperatorAccess(false)
                  setRecordExists(false)
                }}
                onBlur={async () => {
                  const exist = await recordExist(parentName)
                  setRecordExists(exist)

                  const approved = await checkOperatorAccess(parentName)
                  setOperatorAccess(approved)
                }}
                placeholder="mydomain.eth"
                className="flex-1 px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-gray-900 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
              />
              <Button
                onClick={() => setShowENSModal(true)}
                className="bg-gray-900 text-white"
              >
                Choose ENS
              </Button>

              {operatorAccess && recordExists && (
                <Button
                  variant="destructive"
                  disabled={accessLoading}
                  onClick={revokeOperatorAccess}
                >
                  {accessLoading ? 'Revoking...' : 'Revoke Access'}
                </Button>
              )}

              {!operatorAccess && recordExists && (
                <Button disabled={accessLoading} onClick={grantOperatorAccess}>
                  {accessLoading ? 'Granting...' : 'Grant Access'}
                </Button>
              )}
            </div>

            {/* Access Info Message */}
            {((operatorAccess && recordExists) ||
              (!operatorAccess && recordExists)) &&
              !fetchingENS && (
                <p className="text-sm text-yellow-600 mt-2">
                  {operatorAccess ? (
                    'Note: You can revoke Operator role from Enscribe here.'
                  ) : (
                    <p className="text-yellow-600">
                      Note: You can grant Operator role to Enscribe through
                      here, otherwise Enscribe will ask you to grant operator
                      access during deployment.{' '}
                      <Link
                        href="https://www.enscribe.xyz/docs/getting-started/opearator-role"
                        className="text-blue-600 hover:underline"
                      >
                        Why Operator Access is needed?
                      </Link>
                    </p>
                  )}
                </p>
              )}
          </>
        )}

        {/* Full ENS Name Preview */}
        {!isEmpty(label) && !isEmpty(parentName) && (
          <div className="mt-4 mb-4">
            <label className="block text-gray-700 dark:text-gray-300 mb-5">
              Full ENS Name
            </label>
            <div className="bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 rounded-lg p-2 flex items-center">
              <div className="flex-1 font-medium text-blue-800 dark:text-blue-300 text-sm break-all">
                {`${label}.${parentName}`}
              </div>
            </div>
          </div>
        )}
      </div>

      <ENSDomainPickerModal
        open={showENSModal}
        onOpenChange={setShowENSModal}
        fetchingENS={fetchingENS}
        userOwnedDomains={userOwnedDomains}
        onSelectDomain={(domain) => {
          setParentName(domain)
          setShowENSModal(false)
        }}
        title="Choose Your ENS Parent"
        description="Choose one of your owned ENS domains or enter manually."
        onEnterManually={() => {
          setParentName('')
          setShowENSModal(false)
        }}
      />

      <Button
        onClick={deployContract}
        disabled={
          !isConnected || loading || !isValidBytecode || isUnsupportedL2Chain
        }
        className="w-full mt-6 dark:bg-blue-700 dark:hover:bg-gray-800 dark:text-white font-medium py-3"
      >
        {loading ? (
          <svg
            className="animate-spin h-5 w-5 mr-3 text-white"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            ></circle>
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8v8H4z"
            ></path>
          </svg>
        ) : (
          'Deploy'
        )}
      </Button>

      {error && (
        <div className="mt-4 bg-red-50 dark:bg-red-900 border border-red-300 dark:border-red-700 text-red-700 dark:text-red-300 text-sm rounded-md p-3 break-words max-w-full overflow-hidden">
          <strong>Error:</strong> {error}
        </div>
      )}

      <SetNameStepsModal
        open={modalOpen}
        onClose={(result) => {
          setModalOpen(false)
          if (result?.startsWith('ERROR')) {
            setError(result)
            return
          }

          if (result === 'INCOMPLETE') {
            setError(
              'Steps not completed. Please complete all steps before closing.',
            )
          } else {
            // Reset form after successful deployment
            setBytecode('')
            setLabel('')
            setParentType('web3labs')
            setParentName(enscribeDomain)
            setArgs([])
            setAbiText('')
          }

          setIsReverseClaimable(false)
          setIsReverseSetter(false)
          setIsOwnable(false)
        }}
        title={modalTitle}
        subtitle={modalSubtitle}
        steps={modalSteps}
        contractAddress={deployedAddress}
        ensName={`${label}.${parentName}`}
        isSafeWallet={isSafeWallet}
      />
    </div>
  )
}
