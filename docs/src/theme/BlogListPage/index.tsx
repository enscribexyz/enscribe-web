import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import {
  PageMetadata,
  HtmlClassNameProvider,
  ThemeClassNames,
} from '@docusaurus/theme-common';
import Layout from '@theme/Layout';
import SearchMetadata from '@theme/SearchMetadata';
import BlogListPageStructuredData from '@theme/BlogListPage/StructuredData';
import type {Props} from '@theme/BlogListPage';

function BlogListPageMetadata(props: Props): ReactNode {
  const {metadata} = props;
  const {
    siteConfig: {title: siteTitle},
  } = useDocusaurusContext();
  const {blogDescription, blogTitle, permalink} = metadata;
  const isBlogOnlyMode = permalink === '/';
  const title = isBlogOnlyMode ? siteTitle : blogTitle;
  return (
    <>
      <PageMetadata title={title} description={blogDescription} />
      <SearchMetadata tag="blog_posts_list" />
    </>
  );
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function BlogPostCard({
  content: Content,
}: {
  content: Props['items'][number]['content'];
}): ReactNode {
  const {metadata, assets, frontMatter} = Content;
  const {title, permalink, authors, date} = metadata;
  const image = assets?.image ?? frontMatter.image;
  const author = authors?.[0];
  const authorImageUrl =
    assets?.authorsImageUrls?.[0] ?? author?.imageURL;

  return (
    <Link to={permalink} className="card" style={cardStyle}>
      <div style={imageContainerStyle}>
        {image ? (
          <img
            src={image}
            alt={title}
            loading="lazy"
            style={imageStyle}
          />
        ) : (
          <div style={placeholderStyle}>
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{opacity: 0.3}}
            >
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
              <circle cx="8.5" cy="8.5" r="1.5" />
              <polyline points="21 15 16 10 5 21" />
            </svg>
          </div>
        )}
      </div>
      <div style={cardBodyStyle}>
        <h3 style={titleStyle}>{title}</h3>
        <div style={authorRowStyle}>
          {authorImageUrl && (
            <img
              src={authorImageUrl}
              alt={author?.name ?? ''}
              loading="lazy"
              style={avatarStyle}
            />
          )}
          <div style={authorInfoStyle}>
            {author?.name && (
              <span style={authorNameStyle}>{author.name}</span>
            )}
            {author?.title && (
              <span style={authorTitleStyle}>{author.title}</span>
            )}
          </div>
        </div>
        <time dateTime={date} style={dateStyle}>
          {formatDate(date)}
        </time>
      </div>
    </Link>
  );
}

function pageHref(page: number, basePath: string): string {
  return page === 1 ? basePath : `${basePath}/page/${page}`;
}

function getPageNumbers(
  current: number,
  total: number,
): (number | 'ellipsis')[] {
  const maxVisible = 4;
  if (total <= maxVisible) {
    return Array.from({length: total}, (_, i) => i + 1);
  }

  const pages: (number | 'ellipsis')[] = [1];
  // How many slots remain after first and last: maxVisible - 2 = 3
  const windowSize = maxVisible - 2;
  let start = Math.max(2, current - Math.floor(windowSize / 2));
  let end = start + windowSize - 1;

  if (end >= total) {
    end = total - 1;
    start = Math.max(2, end - windowSize + 1);
  }

  if (start > 2) pages.push('ellipsis');
  for (let i = start; i <= end; i++) pages.push(i);
  if (end < total - 1) pages.push('ellipsis');
  pages.push(total);

  return pages;
}

function Pagination({
  page,
  totalPages,
  basePath,
}: {
  page: number;
  totalPages: number;
  basePath: string;
}): ReactNode {
  if (totalPages <= 1) return null;

  const pages = getPageNumbers(page, totalPages);

  return (
    <nav aria-label="Blog list page navigation" style={paginationNavStyle}>
      {pages.map((p, i) =>
        p === 'ellipsis' ? (
          <span key={`ellipsis-${i}`} style={ellipsisStyle}>
            ...
          </span>
        ) : (
          <Link
            key={p}
            to={pageHref(p, basePath)}
            aria-current={p === page ? 'page' : undefined}
            style={{
              ...paginationLinkStyle,
              ...(p === page ? paginationLinkActiveStyle : {}),
            }}
          >
            {p}
          </Link>
        ),
      )}
    </nav>
  );
}

const cardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  textDecoration: 'none',
  color: 'inherit',
  backgroundColor: 'var(--ifm-card-background-color)',
};

const imageContainerStyle: React.CSSProperties = {
  position: 'relative',
  width: '100%',
  aspectRatio: '16 / 9',
  overflow: 'hidden',
  backgroundColor: 'var(--ifm-background-surface-color)',
};

const imageStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  objectFit: 'cover',
  display: 'block',
};

const placeholderStyle: React.CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'var(--ifm-font-color-base)',
};

const cardBodyStyle: React.CSSProperties = {
  padding: '1rem',
  display: 'flex',
  flexDirection: 'column',
  gap: '0.75rem',
};

const titleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1.1rem',
  lineHeight: '1.4',
  color: 'var(--ifm-heading-color)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const authorRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.625rem',
};

const avatarStyle: React.CSSProperties = {
  width: '36px',
  height: '36px',
  borderRadius: '50%',
  objectFit: 'cover',
  flexShrink: 0,
};

const authorInfoStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
};

const authorNameStyle: React.CSSProperties = {
  fontSize: '0.85rem',
  fontWeight: 600,
  color: 'var(--ifm-font-color-base)',
  lineHeight: '1.3',
};

const authorTitleStyle: React.CSSProperties = {
  fontSize: '0.75rem',
  color: 'var(--ifm-font-color-base)',
  opacity: 0.6,
  lineHeight: '1.3',
  overflow: 'hidden',
  textOverflow: 'ellipsis',
  whiteSpace: 'nowrap',
};

const dateStyle: React.CSSProperties = {
  fontSize: '0.8rem',
  color: 'var(--ifm-font-color-base)',
  opacity: 0.5,
};

const gridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(1, 1fr)',
  gap: '1.5rem',
};

const paginationNavStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  gap: '0.5rem',
  marginTop: '2rem',
};

const paginationLinkStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  borderRadius: '6px',
  fontSize: '0.9rem',
  fontWeight: 500,
  textDecoration: 'none',
  color: 'var(--ifm-font-color-base)',
  border: '1px solid var(--ifm-toc-border-color)',
};

const paginationLinkActiveStyle: React.CSSProperties = {
  backgroundColor: 'var(--ifm-color-primary)',
  color: '#ffffff',
  borderColor: 'var(--ifm-color-primary)',
  fontWeight: 600,
};

const ellipsisStyle: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '36px',
  height: '36px',
  fontSize: '0.9rem',
  color: 'var(--ifm-font-color-base)',
  opacity: 0.5,
  userSelect: 'none',
};

const viewAllStyle: React.CSSProperties = {
  display: 'flex',
  justifyContent: 'center',
  marginTop: '1rem',
};

const viewAllLinkStyle: React.CSSProperties = {
  fontSize: '0.9rem',
  color: 'var(--ifm-color-primary)',
  textDecoration: 'none',
};

function BlogListPageContent(props: Props): ReactNode {
  const {metadata, items} = props;
  const {page, totalPages} = metadata;
  const basePath = '/blog';

  return (
    <Layout>
      <div className="container margin-vert--lg">
        <div style={gridStyle} className="blog-post-card-grid">
          {items.map(({content}) => (
            <BlogPostCard key={content.metadata.permalink} content={content} />
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} basePath={basePath} />
        <div style={viewAllStyle}>
          <Link to="/blog/archive" style={viewAllLinkStyle}>
            View all posts
          </Link>
        </div>
      </div>
    </Layout>
  );
}

export default function BlogListPage(props: Props): ReactNode {
  return (
    <HtmlClassNameProvider
      className={clsx(
        ThemeClassNames.wrapper.blogPages,
        ThemeClassNames.page.blogListPage,
      )}>
      <BlogListPageMetadata {...props} />
      <BlogListPageStructuredData {...props} />
      <BlogListPageContent {...props} />
    </HtmlClassNameProvider>
  );
}
