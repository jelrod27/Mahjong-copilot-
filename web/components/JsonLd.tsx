/**
 * Renders a JSON-LD graph.
 *
 * `application/ld+json` is not executed as script, so this is not an XSS
 * vector in the way an inline <script> normally is — but the payload is still
 * serialised with `<` escaped, because a `</script>` sequence appearing inside
 * any string value would terminate the block early and break the page.
 *
 * The CSP in next.config.js allows 'unsafe-inline' for script-src, so no nonce
 * is required here; if that is ever tightened, this needs one.
 */
export function JsonLd({ data }: { data: object | object[] }) {
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: json }}
    />
  );
}

export default JsonLd;
