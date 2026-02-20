import React, {type ReactNode} from 'react';
import clsx from 'clsx';
import {HtmlClassNameProvider, ThemeClassNames} from '@docusaurus/theme-common';
import {
  BlogPostProvider,
  useBlogPost,
} from '@docusaurus/plugin-content-blog/client';
import {usePluginData} from '@docusaurus/useGlobalData';
import Link from '@docusaurus/Link';
import BlogLayout from '@theme/BlogLayout';
import BlogPostItem from '@theme/BlogPostItem';
import BlogPostPaginator from '@theme/BlogPostPaginator';
import BlogPostPageMetadata from '@theme/BlogPostPage/Metadata';
import BlogPostPageStructuredData from '@theme/BlogPostPage/StructuredData';
import TOC from '@theme/TOC';
import ContentVisibility from '@theme/ContentVisibility';
import type {Props} from '@theme/BlogPostPage';
import type {BlogSidebar} from '@docusaurus/plugin-content-blog';

type RelatedPost = {
  permalink: string;
  title: string;
  date: string;
  authorName: string | null;
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function RelatedPosts(): ReactNode {
  const {metadata} = useBlogPost();
  const {relatedPosts} = usePluginData(
    'docusaurus-plugin-related-posts',
  ) as {relatedPosts: Record<string, RelatedPost[]>};

  const related = relatedPosts?.[metadata.permalink];
  if (!related || related.length === 0) return null;

  return (
    <div style={sectionStyle}>
      <h2 style={sectionHeadingStyle}>Related posts</h2>
      <div style={relatedGridStyle} className="related-posts-grid">
        {related.map((post) => (
          <Link
            key={post.permalink}
            to={post.permalink}
            className="card"
            style={relatedCardStyle}
          >
            <h3 style={relatedTitleStyle}>{post.title}</h3>
            <div style={relatedMetaStyle}>
              {post.authorName && (
                <span>{post.authorName}</span>
              )}
              <time dateTime={post.date}>{formatDate(post.date)}</time>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

const sectionStyle: React.CSSProperties = {
  marginTop: '2.5rem',
  paddingTop: '2rem',
  borderTop: '1px solid var(--ifm-toc-border-color)',
};

const sectionHeadingStyle: React.CSSProperties = {
  fontSize: '1.25rem',
  marginBottom: '1rem',
  color: 'var(--ifm-heading-color)',
};

const relatedGridStyle: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: '1fr',
  gap: '1rem',
};

const relatedCardStyle: React.CSSProperties = {
  display: 'flex',
  flexDirection: 'column',
  gap: '0.5rem',
  padding: '1rem',
  textDecoration: 'none',
  color: 'inherit',
  backgroundColor: 'var(--ifm-card-background-color)',
};

const relatedTitleStyle: React.CSSProperties = {
  margin: 0,
  fontSize: '1rem',
  lineHeight: '1.4',
  color: 'var(--ifm-heading-color)',
  display: '-webkit-box',
  WebkitLineClamp: 2,
  WebkitBoxOrient: 'vertical',
  overflow: 'hidden',
};

const relatedMetaStyle: React.CSSProperties = {
  display: 'flex',
  gap: '0.75rem',
  fontSize: '0.8rem',
  color: 'var(--ifm-font-color-base)',
  opacity: 0.6,
};

function BlogPostPageContent({
  sidebar,
  children,
}: {
  sidebar: BlogSidebar;
  children: ReactNode;
}): ReactNode {
  const {metadata, toc} = useBlogPost();
  const {nextItem, prevItem, frontMatter} = metadata;
  const {
    hide_table_of_contents: hideTableOfContents,
    toc_min_heading_level: tocMinHeadingLevel,
    toc_max_heading_level: tocMaxHeadingLevel,
  } = frontMatter;
  return (
    <BlogLayout
      sidebar={sidebar}
      toc={
        !hideTableOfContents && toc.length > 0 ? (
          <TOC
            toc={toc}
            minHeadingLevel={tocMinHeadingLevel}
            maxHeadingLevel={tocMaxHeadingLevel}
          />
        ) : undefined
      }>
      <ContentVisibility metadata={metadata} />

      <BlogPostItem>{children}</BlogPostItem>

      {(nextItem || prevItem) && (
        <BlogPostPaginator nextItem={nextItem} prevItem={prevItem} />
      )}

      <RelatedPosts />
    </BlogLayout>
  );
}

export default function BlogPostPage(props: Props): ReactNode {
  const BlogPostContent = props.content;
  return (
    <BlogPostProvider content={props.content} isBlogPostPage>
      <HtmlClassNameProvider
        className={clsx(
          ThemeClassNames.wrapper.blogPages,
          ThemeClassNames.page.blogPostPage,
        )}>
        <BlogPostPageMetadata />
        <BlogPostPageStructuredData />
        <BlogPostPageContent sidebar={props.sidebar}>
          <BlogPostContent />
        </BlogPostPageContent>
      </HtmlClassNameProvider>
    </BlogPostProvider>
  );
}
