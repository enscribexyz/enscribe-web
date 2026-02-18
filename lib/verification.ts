import {
  CONTRACTS,
  SOURCIFY_API,
  ETHERSCAN_API,
  CHAINS,
} from '@/utils/constants'

export async function getVerificationData(chainId: string, address: string) {
  let sourcify_verification = 'unverified'

  try {
    console.log('sourcify-api - ', SOURCIFY_API + chainId + '/' + address)
    const res = await fetch(
      `${SOURCIFY_API}${chainId}/${address.toLowerCase()}`,
    )
    if (res.ok) {
      const data = await res.json()
      if (data) {
        sourcify_verification = data.match || 'unverified'
      }
    }
  } catch (err) {
    console.error('Sourcify fetch failed:', err)
  }

  let etherscan_verification = 'unverified'

  try {
    const etherscanApi = `${ETHERSCAN_API}&chainid=${chainId}&module=contract&action=getabi&address=${address}`
    console.log('etherscan-api - ', etherscanApi)
    const res = await fetch(etherscanApi)
    const data = await res.json()
    if (data.message === 'OK') {
      etherscan_verification = 'verified'
    }
  } catch (err) {
    console.error('Etherscan fetch failed:', err)
  }

  let blockscout_verification = 'unverified'
  const config = chainId ? CONTRACTS[Number(chainId)] : undefined

  try {
    const blockscoutApi = `${config?.BLOCKSCOUT_URL}api/v2/smart-contracts/${address}`
    console.log('blockscout-api - ', blockscoutApi)
    const res = await fetch(blockscoutApi)
    const data = await res.json()
    if (data.is_verified === true) {
      if (data.is_fully_verified === true)
        blockscout_verification = 'exact_match'
      else blockscout_verification = 'match'
    }
  } catch (err) {
    console.error('Blockscout fetch failed:', err)
  }

  let diligence_audit = ''
  let openZepplin_audit = ''
  let cyfrin_audit = ''

  // Linea Rollup related contracts
  const lineaRollupAddressesL1 = [
    '0x07ddce60658A61dc1732Cacf2220FcE4A01C49B0', // LineaRollup
    '0x2B6A2F8880220a66DfB9059FCB76F7dB54104a34', // TokenBridgeL1
    '0x07ddce60658a61dc1732cacf2220fce4a01c49b0', // L1MessageService
    '0x36f274C1C197F277EA3C57859729398FCc8a3763', // BridgedToken
    '0xd6B95c960779c72B8C6752119849318E5d550574', // L1Timelock
    '0x41A4d93d09f4718fe899D12A4aD2C8a09104bdc7', // PlonkVerifierMainnetFull
  ].map((addr) => addr.toLowerCase())

  // Linea Rollup related contracts
  const lineaRollupAddressesL2 = [
    '0x05d43713b7e333d2d54be65ce3b5f3698ab960fd', // L2MessageService
    '0xd90ed3d4f9d11262d3d346a4369058d5b3777137', // L2TokenBridge
  ].map((addr) => addr.toLowerCase())

  // Linea ENS related contracts
  const ensAddresses = [
    '0xDb75Db974B1F2bD3b5916d503036208064D18295', // ETHRegistrarController
    '0xE5fC544002067dFD69ADF8854D026217bE67BbB3', // PohRegistrationManager
    '0xBf14cFAFD7B83f6de881ae6dc10796ddD7220831', // PohVerifier
    '0xA53cca02F98D590819141Aa85C891e2Af713C223', // NameWrapper
  ].map((addr) => addr.toLowerCase())

  // Convert input address to lowercase for comparison
  const addressLower = address.toLowerCase()

  if (
    lineaRollupAddressesL1.includes(addressLower) &&
    Number(chainId) === CHAINS.MAINNET
  ) {
    diligence_audit =
      'https://diligence.consensys.io/audits/2024/12/linea-rollup-update/'
    openZepplin_audit =
      'https://blog.openzeppelin.com/linearollup-and-tokenbridge-role-upgrade'
    cyfrin_audit =
      'https://github.com/Cyfrin/cyfrin-audit-reports/blob/642b409c207d0e31679467480c3d9b8797b98696/reports/2025-01-06-cyfrin-linea-v2.2.pdf'
  } else if (
    lineaRollupAddressesL2.includes(addressLower) &&
    Number(chainId) === CHAINS.LINEA
  ) {
    diligence_audit =
      'https://diligence.consensys.io/audits/2024/12/linea-rollup-update/'
    openZepplin_audit =
      'https://blog.openzeppelin.com/linearollup-and-tokenbridge-role-upgrade'
    cyfrin_audit =
      'https://github.com/Cyfrin/cyfrin-audit-reports/blob/642b409c207d0e31679467480c3d9b8797b98696/reports/2025-01-06-cyfrin-linea-v2.2.pdf'
  } else if (
    ensAddresses.includes(addressLower) &&
    Number(chainId) === CHAINS.LINEA
  ) {
    diligence_audit = 'https://diligence.consensys.io/audits/2024/06/linea-ens/'
  }

  // let ens_name = ""
  // try {
  //     ens_name = await getENS(chainId, address)
  // } catch (error) {
  //     console.error('ENS primary name fetch failed:', error);
  // }

  return {
    sourcify_verification,
    etherscan_verification,
    blockscout_verification,
    audit_status: 'audited',
    attestation_tx_hash: '0xabc123',
    diligence_audit,
    openZepplin_audit,
    cyfrin_audit,
    // ens_name
  }
}

export async function triggerVerificationLogic(
  networkId: string,
  address: string,
) {
  // logic to trigger verification
  return {
    sourcify: 'req_id',
    etherscan: 'req_id',
    attestation: 'tx_id',
  }
}

