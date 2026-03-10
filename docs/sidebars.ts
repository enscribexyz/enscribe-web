import type {SidebarsConfig} from '@docusaurus/plugin-content-docs';

const sidebars: SidebarsConfig = {
  docsSidebar: [
    {type: 'doc', id: 'introduction/index', label: 'Quick Start'},
    {
      type: 'category',
      label: 'Using Enscribe',
      items: [
        {type: 'doc', id: 'getting-started/index', label: 'Overview'},
        'getting-started/explore-addresses',
        'getting-started/name-explorer',
        'getting-started/naming-existing-contracts',
        'getting-started/contract-deployment-service',
        'getting-started/deployment-history',
        'getting-started/my-account-view',
        'getting-started/using-safe-wallet',
      ],
    },
    {
      type: 'category',
      label: 'Concepts',
      items: [
        {type: 'doc', id: 'introduction/overview', label: 'Overview'},
        'introduction/what-is-enscribe',
        'introduction/what-is-ens',
        'introduction/naming-contracts',
        'introduction/contract-metadata',
        'introduction/supported-networks',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        {type: 'doc', id: 'reference/index', label: 'Overview'},
        'getting-started/bytcode-abi',
        'getting-started/opearator-role',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        {type: 'doc', id: 'advanced/index', label: 'Overview'},
        'advanced/ens-terms',
        'advanced/l1-l2-chains',
        'advanced/design-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Developer tools',
      items: [
        {type: 'doc', id: 'dev-tools/index', label: 'Overview'},
        'dev-tools/enscribe-ts',
        'dev-tools/hardhat-enscribe',
        'dev-tools/enscribe-sol',
      ],
    },
    {type: 'link', label: 'API', href: '/api/enscribe-api'},
    {type: 'doc', id: 'faqs', label: 'FAQs'},
    {type: 'doc', id: 'brand', label: 'Brand'},
  ],
};

export default sidebars;
