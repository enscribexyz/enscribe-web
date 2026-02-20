import useDocusaurusContext from '@docusaurus/useDocusaurusContext';

const stripProtocolAndTrailingSlash = (url) =>
  url.replace(/^https?:\/\//, '').replace(/\/$/, '');

const buildHref = (baseUrl, path) => {
  if (!path) return baseUrl;

  try {
    const normalizedBase = baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`;
    return new URL(path, normalizedBase).toString();
  } catch {
    const normalizedPath = String(path).replace(/^\//, '');
    return `${baseUrl.replace(/\/$/, '')}/${normalizedPath}`;
  }
};

const AppUrl = ({path = '', customField = 'appUrl', label, children, ...anchorProps}) => {
  const {
    siteConfig: {customFields},
  } = useDocusaurusContext();

  const baseUrl = customFields?.[customField];
  if (!baseUrl || typeof baseUrl !== 'string') {
    return <span>{`${customField} is not defined`}</span>;
  }

  const href = buildHref(baseUrl, path);
  const displayText =
    children ?? label ?? stripProtocolAndTrailingSlash(href);

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" {...anchorProps}>
      {displayText}
    </a>
  );
};

export default AppUrl;
