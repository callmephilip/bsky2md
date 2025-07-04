import { BskyXRPC } from "@mary/bluesky-client";
import type {
  AppBskyEmbedExternal,
  AppBskyEmbedImages,
  AppBskyFeedDefs,
  AppBskyFeedPost,
  AppBskyRichtextFacet,
} from "@mary/bluesky-client/lexicons";
// 🦕 AUTOGENERATED! DO NOT EDIT! File to edit: bsky.ipynb

type UnwrapArray<T> = T extends (infer V)[] ? V : never;

export type Facet = AppBskyRichtextFacet.Main;
export type FacetFeature = UnwrapArray<Facet["features"]>;

type Thread = AppBskyFeedDefs.ThreadViewPost;
type Post = AppBskyFeedDefs.PostView;
type PostRecord = AppBskyFeedPost.Record;
type EmbedImages = AppBskyEmbedImages.View;
type EmbedExternal = AppBskyEmbedExternal.View;
type LinkFeature = AppBskyRichtextFacet.Link;
type MentionFeature = AppBskyRichtextFacet.Mention;
// type TagFeature = AppBskyRichtextFacet.Tag;

const rpc = new BskyXRPC({ service: "https://public.api.bsky.app" });
const postURLToAtpURI = async (
  postUrl: string,
): Promise<[string, string]> => {
  const urlParts = new URL(postUrl);
  const pathParts = urlParts.pathname.split("/");
  const h = await rpc.get("com.atproto.identity.resolveHandle", {
    params: {
      handle: pathParts[2],
    },
  });

  return [`at://${h.data.did}/app.bsky.feed.post/${pathParts[4]}`, h.data.did];
};
const unwrapThreadPosts = (
  thread: Thread,
): Post[] => {
  const posts: Post[] = [];

  // Add root post
  if (thread.post) {
    posts.push(thread.post);
  }

  // Recursively handle replies
  if (thread.replies) {
    thread.replies.forEach((reply) => {
      posts.push(...unwrapThreadPosts(reply as Thread));
    });
  }

  // Handle nested reply if present
  if ("parent" in thread && thread.parent) {
    posts.push(
      ...unwrapThreadPosts(thread.parent as Thread),
    );
  }

  return posts;
};

type ThreadData = {
  handle: string;
  posts: Post[];
};

function reconstructThread(posts: Post[]): Post[] {
  const sortChronologically = (a: Post, b: Post): number =>
    // @ts-ignore record type is unknown
    new Date(a.record.createdAt).getTime() -
    // @ts-ignore record type is unknown
    new Date(b.record.createdAt).getTime();
  const postMap = new Map<string, Post>();
  const rootPosts: Post[] = [];
  const childrenMap = new Map<string, Post[]>();

  for (const post of posts) {
    postMap.set(post.uri, post);
    // @ts-ignore record type is unknown
    if (!post.record.reply) {
      rootPosts.push(post);
    } else {
      // @ts-ignore record type is unknown
      const parentUri = post.record.reply.parent.uri;
      if (!childrenMap.has(parentUri)) {
        childrenMap.set(parentUri, []);
      }
      childrenMap.get(parentUri)!.push(post);
    }
  }

  rootPosts.sort(sortChronologically);

  for (const children of childrenMap.values()) {
    children.sort(
      sortChronologically,
    );
  }

  const result: Post[] = [];

  function addPostAndReplies(post: Post) {
    result.push(post);
    const children = childrenMap.get(post.uri) || [];
    for (const child of children) {
      addPostAndReplies(child);
    }
  }

  for (const rootPost of rootPosts) {
    addPostAndReplies(rootPost);
  }

  return result;
}

export const downloadThread = async (
  postUrl: string,
): Promise<ThreadData> => {
  const [uri, handle] = await postURLToAtpURI(postUrl);
  const d = await rpc.get("app.bsky.feed.getPostThread", {
    params: {
      uri,
    },
  });
  return {
    handle,
    posts: reconstructThread(unwrapThreadPosts(d.data.thread as Thread)),
  };
};
// from https://github.com/mary-ext/skeetdeck/blob/aa0cb74c0ace489b79d2671c4b9e740ec21623c7/app/api/richtext/unicode.ts

const encoder = new TextEncoder();
const decoder = new TextDecoder();

interface UtfString {
  u16: string;
  u8: Uint8Array;
}

const createUtfString = (utf16: string): UtfString => {
  return {
    u16: utf16,
    u8: encoder.encode(utf16),
  };
};

const getUtf8Length = (utf: UtfString) => {
  return utf.u8.byteLength;
};

const sliceUtf8 = (utf: UtfString, start?: number, end?: number) => {
  return decoder.decode(utf.u8.slice(start, end));
};

// replace
const externalEmbedToMarkdown = (
  embed: EmbedExternal,
  authorDid: string,
): string => {
  const { title, description, uri, thumb } = embed.external;

  console.log(embed);

  let thumbUrl: string | undefined;

  if (typeof thumb === "string") {
    thumbUrl = thumb;
  } else if (thumb) {
    thumbUrl =
      // @ts-ignore not sure why this is failing
      `https://cdn.bsky.app/img/feed_thumbnail/plain/${authorDid}/${thumb.ref.$link}@jpeg`;
  }

  const thumbImage = thumbUrl ? `![${title}](${thumbUrl})` : null;

  return [`### [${title}](${uri})`, description, thumbImage || ""]
    .map((l: string) => `> ${l}`)
    .join("\n");
};
// from https://github.com/mary-ext/skeetdeck/blob/aa0cb74c0ace489b79d2671c4b9e740ec21623c7/app/api/richtext/segmentize.ts

export interface RichtextSegment {
  text: string;
  feature: FacetFeature | undefined;
}

const createSegment = (
  text: string,
  feature: FacetFeature | undefined,
): RichtextSegment => {
  return { text: text, feature: feature };
};

export const segmentRichText = (
  rtText: string,
  facets: Facet[] | undefined,
): RichtextSegment[] => {
  if (facets === undefined || facets.length === 0) {
    return [createSegment(rtText, undefined)];
  }

  const text = createUtfString(rtText);

  const segments: RichtextSegment[] = [];
  const length = getUtf8Length(text);

  const facetsLength = facets.length;

  let textCursor = 0;
  let facetCursor = 0;

  do {
    const facet = facets[facetCursor];
    const { byteStart, byteEnd } = facet.index;

    if (textCursor < byteStart) {
      segments.push(
        createSegment(sliceUtf8(text, textCursor, byteStart), undefined),
      );
    } else if (textCursor > byteStart) {
      facetCursor++;
      continue;
    }

    if (byteStart < byteEnd) {
      const subtext = sliceUtf8(text, byteStart, byteEnd);
      const features = facet.features;

      if (features.length === 0 || subtext.trim().length === 0) {
        segments.push(createSegment(subtext, undefined));
      } else {
        segments.push(createSegment(subtext, features[0]));
      }
    }

    textCursor = byteEnd;
    facetCursor++;
  } while (facetCursor < facetsLength);

  if (textCursor < length) {
    segments.push(
      createSegment(sliceUtf8(text, textCursor, length), undefined),
    );
  }

  return segments;
};

const processFacets = (text: string, facets: Facet[] | undefined): string => {
  return segmentRichText(text, facets).reduce((acc, segment) => {
    const { text, feature } = segment;

    if (feature?.$type === "app.bsky.richtext.facet#link") {
      return acc + `[${text}](${feature.uri})`;
    } else if (feature?.$type === "app.bsky.richtext.facet#mention") {
      return acc + `[${text}](https://bsky.app/profile/${feature.did})`;
    }

    return acc + segment.text;
  }, "");
};

export const postToMd = (post: Post, handle: string): string => {
  const record = post.record as PostRecord;
  const text = record.text;
  let richtext = text;
  let embeds = "";

  richtext = processFacets(text, record.facets);

  if (post.embed) {
    if (post.embed.$type === "app.bsky.embed.images#view") {
      const e = post.embed as EmbedImages;
      for (const image of e.images) {
        embeds += `![${
          image.alt || "no image description"
        }](${image.fullsize})\n`;
      }
    } else if (post.embed.$type === "app.bsky.embed.external#view") {
      embeds += externalEmbedToMarkdown(
        post.embed as EmbedExternal,
        handle,
      );
    }
  }

  const [d, t] = record.createdAt.split("T");
  const [h, m] = t.split(":");

  const r = [
    `> [${post.author.displayName} - @${post.author.handle}](https://bsky.app/profile/${post.author.handle}) **${d} ${
      [h, m].join(
        ":",
      )
    }**`,
    ...richtext.split("\n").filter((l: string) => l.trim() !== ""),
    embeds,
  ].join("\n\n");

  return r;
};

// await Deno.jupyter.display(
//   {
//     "text/markdown": postToMd(posts[4], handle),
//   },
//   { raw: true }
// );
export const downloadPostToMd = async (postUrl: string): Promise<string> => {
  const { posts, handle } = await downloadThread(postUrl);
  return posts.map((post) => postToMd(post, handle)).join("\n\n");
};
