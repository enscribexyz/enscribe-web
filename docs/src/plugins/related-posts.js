/** @type {import('@docusaurus/types').PluginModule} */
module.exports = function relatedPostsPlugin() {
  return {
    name: 'docusaurus-plugin-related-posts',

    async allContentLoaded({allContent, actions}) {
      const {setGlobalData} = actions;

      const blogContent =
        allContent['docusaurus-plugin-content-blog']?.default;
      if (!blogContent) {
        setGlobalData({relatedPosts: {}});
        return;
      }

      const {blogPosts} = blogContent;

      // Build tag label → posts index
      const tagIndex = new Map();
      for (const post of blogPosts) {
        const {tags, permalink, title, date, authors} = post.metadata;
        const author = authors?.[0];
        const entry = {
          permalink,
          title,
          date: typeof date === 'string' ? date : date.toISOString(),
          authorName: author?.name ?? null,
        };

        for (const tag of tags) {
          if (!tagIndex.has(tag.label)) {
            tagIndex.set(tag.label, []);
          }
          tagIndex.get(tag.label).push(entry);
        }
      }

      // For each post, find related posts ranked by shared tag count
      const relatedPosts = {};
      for (const post of blogPosts) {
        const {tags, permalink} = post.metadata;
        const scored = new Map();

        for (const tag of tags) {
          const postsWithTag = tagIndex.get(tag.label) ?? [];
          for (const related of postsWithTag) {
            if (related.permalink === permalink) continue;
            if (!scored.has(related.permalink)) {
              scored.set(related.permalink, {...related, score: 0});
            }
            scored.get(related.permalink).score++;
          }
        }

        relatedPosts[permalink] = Array.from(scored.values())
          .sort((a, b) => b.score - a.score)
          .slice(0, 3)
          .map(({score, ...rest}) => rest);
      }

      setGlobalData({relatedPosts});
    },
  };
};
