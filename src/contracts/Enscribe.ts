const enscribeContractABI = [
  {
    inputs: [
      {
        internalType: 'address',
        name: '_reverseRegistrar',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_ensRegistry',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '_nameWrapper',
        type: 'address',
      },
      {
        internalType: 'string',
        name: '_defaultParent',
        type: 'string',
      },
      {
        internalType: 'uint256',
        name: '_pricing',
        type: 'uint256',
      },
    ],
    stateMutability: 'nonpayable',
    type: 'constructor',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'OwnableInvalidOwner',
    type: 'error',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'account',
        type: 'address',
      },
    ],
    name: 'OwnableUnauthorizedAccount',
    type: 'error',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'contractAddress',
        type: 'address',
      },
    ],
    name: 'ContractDeployed',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'address',
        name: 'owner',
        type: 'address',
      },
    ],
    name: 'ContractOwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'address',
        name: 'sender',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'uint256',
        name: 'amount',
        type: 'uint256',
      },
    ],
    name: 'EtherReceived',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'previousOwner',
        type: 'address',
      },
      {
        indexed: true,
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'OwnershipTransferred',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'contractAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'subname',
        type: 'string',
      },
    ],
    name: 'SetAddrSuccess',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: true,
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'subname',
        type: 'string',
      },
    ],
    name: 'SetPrimaryNameSuccess',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      {
        indexed: false,
        internalType: 'bytes32',
        name: 'parentHash',
        type: 'bytes32',
      },
      {
        indexed: false,
        internalType: 'string',
        name: 'label',
        type: 'string',
      },
    ],
    name: 'SubnameCreated',
    type: 'event',
  },
  {
    stateMutability: 'payable',
    type: 'fallback',
  },
  {
    inputs: [
      {
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'checkWrapped',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'salt',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: 'bytecode',
        type: 'bytes',
      },
    ],
    name: 'computeAddress',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'defaultParent',
    outputs: [
      {
        internalType: 'string',
        name: '',
        type: 'string',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'ensRegistry',
    outputs: [
      {
        internalType: 'contract IENSRegistry',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'nameWrapper',
    outputs: [
      {
        internalType: 'contract INameWrapper',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
      {
        internalType: 'uint256[]',
        name: '',
        type: 'uint256[]',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    name: 'onERC1155BatchReceived',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
      {
        internalType: 'bytes',
        name: '',
        type: 'bytes',
      },
    ],
    name: 'onERC1155Received',
    outputs: [
      {
        internalType: 'bytes4',
        name: '',
        type: 'bytes4',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [],
    name: 'owner',
    outputs: [
      {
        internalType: 'address',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
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
  {
    inputs: [],
    name: 'renounceOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'reverseRegistrar',
    outputs: [
      {
        internalType: 'contract IReverseRegistrar',
        name: '',
        type: 'address',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_addr',
        type: 'address',
      },
    ],
    name: 'setENSRegistry',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'contractAddress',
        type: 'address',
      },
      {
        internalType: 'string',
        name: 'label',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'parentNode',
        type: 'bytes32',
      },
    ],
    name: 'setName',
    outputs: [
      {
        internalType: 'bool',
        name: 'success',
        type: 'bool',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'bytecode',
        type: 'bytes',
      },
      {
        internalType: 'string',
        name: 'label',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'parentNode',
        type: 'bytes32',
      },
    ],
    name: 'setNameAndDeploy',
    outputs: [
      {
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'bytecode',
        type: 'bytes',
      },
      {
        internalType: 'string',
        name: 'label',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'parentNode',
        type: 'bytes32',
      },
    ],
    name: 'setNameAndDeployReverseClaimer',
    outputs: [
      {
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'bytecode',
        type: 'bytes',
      },
      {
        internalType: 'string',
        name: 'label',
        type: 'string',
      },
      {
        internalType: 'string',
        name: 'parentName',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'parentNode',
        type: 'bytes32',
      },
    ],
    name: 'setNameAndDeployReverseSetter',
    outputs: [
      {
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes',
        name: 'bytecode',
        type: 'bytes',
      },
      {
        internalType: 'string',
        name: 'ensName',
        type: 'string',
      },
      {
        internalType: 'bytes32',
        name: 'node',
        type: 'bytes32',
      },
    ],
    name: 'setNameAndDeployWithoutLabel',
    outputs: [
      {
        internalType: 'address',
        name: 'deployedAddress',
        type: 'address',
      },
    ],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_addr',
        type: 'address',
      },
    ],
    name: 'setNameWrapper',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: '_addr',
        type: 'address',
      },
    ],
    name: 'setReverseRegistrar',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'bytes4',
        name: 'interfaceId',
        type: 'bytes4',
      },
    ],
    name: 'supportsInterface',
    outputs: [
      {
        internalType: 'bool',
        name: '',
        type: 'bool',
      },
    ],
    stateMutability: 'pure',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'address',
        name: 'newOwner',
        type: 'address',
      },
    ],
    name: 'transferOwnership',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'string',
        name: 'newParent',
        type: 'string',
      },
    ],
    name: 'updateDefaultParent',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      {
        internalType: 'uint256',
        name: 'newPrice',
        type: 'uint256',
      },
    ],
    name: 'updatePricing',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'withdraw',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    stateMutability: 'payable',
    type: 'receive',
  },
]

export default enscribeContractABI
