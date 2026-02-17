const enscribeV2ContractABI = [
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'contractAddresses',
        type: 'address[]',
      },
      {
        internalType: 'string[]',
        name: 'labels',
        type: 'string[]',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
    ],
    name: 'setNameBatch',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address[]',
        name: 'contractAddresses',
        type: 'address[]',
      },
      {
        internalType: 'string[]',
        name: 'labels',
        type: 'string[]',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
      {
        internalType: 'uint256[]',
        name: 'coinTypes',
        type: 'uint256[]',
      },
    ],
    name: 'setNameBatch',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'pricing',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
]

export default enscribeV2ContractABI

