import React from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import {ThemeClassNames} from '@docusaurus/theme-common';
import {useDoc} from '@docusaurus/plugin-content-docs/client';
import TagsListInline from '@theme/TagsListInline';
import EditMetaRow from '@theme/EditMetaRow';
import styles from './styles.module.css';

export default function DocItemFooter(): React.JSX.Element {
  const {metadata} = useDoc();
  const {editUrl, lastUpdatedAt, lastUpdatedBy, tags} = metadata;

  const canDisplayTagsRow = tags.length > 0;
  const canDisplayEditMetaRow = Boolean(editUrl || lastUpdatedAt || lastUpdatedBy);

  return (
    <footer
      className={clsx(
        ThemeClassNames.docs.docFooter,
        'docusaurus-mt-lg',
        styles.docFooter,
      )}>
      {canDisplayTagsRow && (
        <div
          className={clsx(
            'row margin-top--sm',
            ThemeClassNames.docs.docFooterTagsRow,
          )}>
          <div className="col">
            <TagsListInline tags={tags} />
          </div>
        </div>
      )}

      {canDisplayEditMetaRow && (
        <EditMetaRow
          className={clsx(
            'margin-top--sm',
            ThemeClassNames.docs.docFooterEditMetaRow,
          )}
          editUrl={editUrl}
          lastUpdatedAt={lastUpdatedAt}
          lastUpdatedBy={lastUpdatedBy}
        />
      )}

      <p className={styles.helpText}>
        Need help?{' '}
        <Link
          href="https://discord.gg/YztSPKHH"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.helpLink}>
          Join our Discord channel
        </Link>
        .
      </p>
    </footer>
  );
}
