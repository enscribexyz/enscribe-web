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
        'introduction/what-is-enscribe',
        'introduction/what-is-ens',
        'introduction/naming-contracts',
        'introduction/supported-networks',
      ],
    },
    {
      type: 'category',
      label: 'Reference',
      items: [
        'getting-started/bytcode-abi',
        'getting-started/opearator-role',
        'faqs',
      ],
    },
    {
      type: 'category',
      label: 'Advanced',
      items: [
        'advanced/index',
        'advanced/ens-terms',
        'advanced/l1-l2-chains',
        'advanced/design-architecture',
      ],
    },
    {
      type: 'category',
      label: 'Developer tools',
      items: [
        'dev-tools/index',
        'dev-tools/enscribe-ts',
        'dev-tools/hardhat-enscribe',
        'dev-tools/enscribe-sol',
      ],
    },
    {type: 'link', label: 'API', href: '/api/enscribe-api'},
    {type: 'doc', id: 'brand', label: 'Brand'},
  ],
};

export default sidebars;
