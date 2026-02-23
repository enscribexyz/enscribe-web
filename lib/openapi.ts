export const ENSCRIBE_OPENAPI_SPEC = {
  openapi: '3.1.0',
  info: {
    title: 'Enscribe API',
    version: '1.0.0',
    description:
      'API reference for Enscribe v1 endpoints exposed from the Next.js application.',
  },
  servers: [
    {
      url: '/',
      description: 'Current deployment origin',
    },
  ],
  tags: [
    { name: 'Utility', description: 'Utility endpoints for name generation and minting.' },
    { name: 'Metrics', description: 'Metrics ingestion endpoints.' },
    { name: 'Config', description: 'Chain configuration discovery endpoints.' },
    { name: 'Metadata', description: 'ENS text-record metadata lookup endpoints.' },
    { name: 'Scoring', description: 'Address scoring endpoints.' },
    { name: 'Verification', description: 'Contract verification endpoints.' },
  ],
  paths: {
    '/api/v1/name': {
      get: {
        tags: ['Utility'],
        operationId: 'generateName',
        summary: 'Generate a random contract name',
        description:
          'Returns a random two-word slug with a 4-digit suffix as plain text.',
        responses: {
          '200': {
            description: 'Generated name',
            content: {
              'text/plain': {
                schema: { type: 'string' },
                example: 'curious-lion-4821',
              },
            },
          },
        },
      },
    },
    '/api/v1/metrics': {
      post: {
        tags: ['Metrics'],
        operationId: 'logMetrics',
        summary: 'Insert a metrics record',
        description:
          'Logs contract naming metrics into Supabase. The server does not validate required fields before insert.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                $ref: '#/components/schemas/MetricsRequest',
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Metrics logged',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatusSuccessResponse' },
              },
            },
          },
          '500': {
            description: 'Insert/logging failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatusMessageResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/mint': {
      post: {
        tags: ['Utility'],
        operationId: 'getNextPoapLink',
        summary: 'Get next POAP mint link',
        description: 'Fetches the next mint link via a Supabase RPC call.',
        responses: {
          '200': {
            description: 'POAP link fetched',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/MintSuccessResponse' },
              },
            },
          },
          '500': {
            description: 'RPC/logging failure',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/StatusMessageResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/config/{chainId}': {
      get: {
        tags: ['Config'],
        operationId: 'getChainConfig',
        summary: 'Get chain config addresses',
        parameters: [
          {
            name: 'chainId',
            in: 'path',
            required: true,
            description: 'EVM chain ID.',
            schema: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
            example: '8453',
          },
        ],
        responses: {
          '200': {
            description: 'Chain config',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ChainConfigResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid chain ID',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '404': {
            description: 'No config for chain',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/contractMetadata/{chainId}/{name}': {
      get: {
        tags: ['Metadata'],
        operationId: 'getContractMetadata',
        summary: 'Fetch ENS text-record metadata',
        parameters: [
          {
            name: 'chainId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
            example: '1',
          },
          {
            name: 'name',
            in: 'path',
            required: true,
            description: 'Fully-qualified ENS name. URL-encode dots and special characters.',
            schema: { type: 'string' },
            example: 'vault.eth',
          },
        ],
        responses: {
          '200': {
            description: 'Resolved text records (most fields are optional)',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ContractMetadataResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid params or unsupported chain',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Internal error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/bs/{chainId}/{address}': {
      get: {
        tags: ['Scoring'],
        operationId: 'getAddressScore',
        summary: 'Get ENS score for an address',
        description:
          'Returns a score based on number of forward names, primary name, and metadata presence.',
        parameters: [
          {
            name: 'chainId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
            example: '8453',
          },
          {
            name: 'address',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
            },
            example: '0x1234567890abcdef1234567890abcdef12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Computed score',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/BsScoreResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid params',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
    '/api/v1/verification/{networkId}/{contractAddress}': {
      get: {
        tags: ['Verification'],
        operationId: 'getVerificationStatus',
        summary: 'Get verification status',
        parameters: [
          {
            name: 'networkId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
            example: '1',
          },
          {
            name: 'contractAddress',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
            },
            example: '0x1234567890abcdef1234567890abcdef12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Verification status',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerificationStatusResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Internal error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
      post: {
        tags: ['Verification'],
        operationId: 'triggerVerification',
        summary: 'Trigger verification workflow',
        parameters: [
          {
            name: 'networkId',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^[0-9]+$',
            },
            example: '1',
          },
          {
            name: 'contractAddress',
            in: 'path',
            required: true,
            schema: {
              type: 'string',
              pattern: '^0x[a-fA-F0-9]{40}$',
            },
            example: '0x1234567890abcdef1234567890abcdef12345678',
          },
        ],
        responses: {
          '200': {
            description: 'Verification workflow triggered',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/VerificationTriggerResponse' },
              },
            },
          },
          '400': {
            description: 'Invalid parameters',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
          '500': {
            description: 'Internal error',
            content: {
              'application/json': {
                schema: { $ref: '#/components/schemas/ErrorResponse' },
              },
            },
          },
        },
      },
    },
  },
  components: {
    schemas: {
      ErrorResponse: {
        type: 'object',
        required: ['error'],
        properties: {
          error: { type: 'string' },
        },
      },
      StatusSuccessResponse: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', example: 'success' },
        },
      },
      StatusMessageResponse: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string' },
        },
      },
      MetricsRequest: {
        type: 'object',
        properties: {
          contract_address: { type: 'string', example: '0x1234567890abcdef1234567890abcdef12345678' },
          ens_name: { type: 'string', example: 'vault.eth' },
          deployer_address: { type: 'string', example: '0xabcdefabcdefabcdefabcdefabcdefabcdefabcd' },
          network: { type: 'string', example: 'base' },
          timestamp: { type: 'string', description: 'ISO 8601 timestamp', example: '2026-02-23T12:00:00.000Z' },
          source: { type: 'string', example: 'web' },
          op_type: { type: 'string', example: 'name_contract' },
          co_id: { type: 'string', example: 'session-123' },
          step: { type: 'string', example: 'complete' },
          txn_hash: { type: 'string', example: '0xdeadbeef' },
          contract_type: { type: 'string', example: 'upgradeable' },
        },
        additionalProperties: true,
      },
      MintSuccessResponse: {
        type: 'object',
        required: ['status', 'link'],
        properties: {
          status: { type: 'string', example: 'success' },
          link: { type: ['string', 'null'], example: 'https://poap.xyz/mint/xyz' },
        },
      },
      ChainConfigResponse: {
        type: 'object',
        required: [
          'reverse_registrar_addr',
          'ens_registry_addr',
          'public_resolver_addr',
          'name_wrapper_addr',
          'enscribe_addr',
          'parent_name',
        ],
        properties: {
          reverse_registrar_addr: { type: 'string' },
          ens_registry_addr: { type: 'string' },
          public_resolver_addr: { type: 'string' },
          name_wrapper_addr: { type: 'string' },
          enscribe_addr: { type: 'string' },
          parent_name: { type: 'string' },
        },
      },
      ContractMetadataResponse: {
        type: 'object',
        properties: {
          alias: { type: 'string' },
          avatar: { type: 'string' },
          name: { type: 'string' },
          description: { type: 'string' },
          header: { type: 'string' },
          url: { type: 'string' },
          category: { type: 'string' },
          license: { type: 'string' },
          docs: { type: 'string' },
          audits: { type: 'string' },
          'com.github': { type: 'string' },
          'com.twitter': { type: 'string' },
          'org.telegram': { type: 'string' },
          'com.linkedin': { type: 'string' },
        },
        additionalProperties: false,
      },
      BsScoreResponse: {
        type: 'object',
        required: ['score'],
        properties: {
          score: {
            type: 'number',
            description: 'Score from 0 to 100.',
            minimum: 0,
            maximum: 100,
            example: 75,
          },
        },
      },
      VerificationStatusResponse: {
        type: 'object',
        required: [
          'sourcify_verification',
          'etherscan_verification',
          'blockscout_verification',
          'audit_status',
          'attestation_tx_hash',
          'diligence_audit',
          'openZepplin_audit',
          'cyfrin_audit',
        ],
        properties: {
          sourcify_verification: { type: 'string', example: 'match' },
          etherscan_verification: { type: 'string', example: 'verified' },
          blockscout_verification: { type: 'string', example: 'exact_match' },
          audit_status: { type: 'string', example: 'audited' },
          attestation_tx_hash: { type: 'string', example: '0xabc123' },
          diligence_audit: { type: 'string' },
          openZepplin_audit: { type: 'string' },
          cyfrin_audit: { type: 'string' },
        },
      },
      VerificationTriggerResponse: {
        type: 'object',
        required: ['sourcify', 'etherscan', 'attestation'],
        properties: {
          sourcify: { type: 'string', example: 'req_id' },
          etherscan: { type: 'string', example: 'req_id' },
          attestation: { type: 'string', example: 'tx_id' },
        },
      },
    },
  },
} as const
