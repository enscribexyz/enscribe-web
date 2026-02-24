import type { SidebarsConfig } from "@docusaurus/plugin-content-docs";

const sidebar: SidebarsConfig = {
  apisidebar: [
    {
      type: "doc",
      id: "enscribe-api",
    },
    {
      type: "category",
      label: "Utility",
      link: {
        type: "doc",
        id: "utility",
      },
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "generate-name",
          label: "Generate a random contract name",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Config",
      link: {
        type: "doc",
        id: "config",
      },
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "get-chain-config",
          label: "Get chain config addresses",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Metadata",
      link: {
        type: "doc",
        id: "metadata",
      },
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "get-contract-metadata",
          label: "Fetch ENS text-record metadata",
          className: "api-method get",
        },
      ],
    },
    {
      type: "category",
      label: "Verification",
      link: {
        type: "doc",
        id: "verification",
      },
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "get-verification-status",
          label: "Get verification status",
          className: "api-method get",
        },
        {
          type: "doc",
          id: "trigger-verification",
          label: "Trigger verification workflow",
          className: "api-method post",
        },
      ],
    },
    {
      type: "category",
      label: "Schemas",
      collapsed: false,
      items: [
        {
          type: "doc",
          id: "schemas/chainconfigresponse",
          label: "ChainConfigResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "schemas/contractmetadataresponse",
          label: "ContractMetadataResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "schemas/verificationstatusresponse",
          label: "VerificationStatusResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "schemas/verificationtriggerresponse",
          label: "VerificationTriggerResponse",
          className: "schema",
        },
        {
          type: "doc",
          id: "schemas/errorresponse",
          label: "ErrorResponse",
          className: "schema",
        },
      ],
    },
  ],
};

export default sidebar.apisidebar;
