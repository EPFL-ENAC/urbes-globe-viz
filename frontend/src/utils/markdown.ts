import MarkdownIt from "markdown-it";

// Shared markdown-it instance used to render project/subViz descriptions.
// `html: true` keeps inline HTML working, so descriptions can mix plain prose,
// markdown syntax, and raw HTML in the same field.
// `typographer: false` avoids auto-converting `--` into em dashes.
const md = new MarkdownIt({
  html: true,
  linkify: true,
  breaks: false,
  typographer: false,
});

// Force every generated link (markdown syntax + autolinked URLs) to open in a
// new tab. Raw inline-HTML <a> tags in descriptions are passed through verbatim,
// so those carry their own target attribute.
const defaultLinkOpen =
  md.renderer.rules.link_open ||
  ((tokens, idx, options, _env, self) =>
    self.renderToken(tokens, idx, options));
md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
  const token = tokens[idx];
  if (token) {
    token.attrSet("target", "_blank");
    token.attrSet("rel", "noopener noreferrer");
  }
  return defaultLinkOpen(tokens, idx, options, env, self);
};

// Descriptions live in committed TS files reviewed via PR, so no runtime
// sanitization is applied. If descriptions ever come from user input, pipe
// the output through a sanitizer (e.g. DOMPurify) before returning.
export function renderDescription(src: string | undefined): string {
  if (!src) return "";
  return md.render(src);
}
