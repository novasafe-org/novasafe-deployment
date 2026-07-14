/** CDK placeholder until novasafe-auth-v2 Deploy AWS uploads the real SSR zip. */
export const handler = async () => ({
  statusCode: 503,
  headers: { "content-type": "text/html; charset=utf-8" },
  body:
    "<!DOCTYPE html><html><body><h1>NovaSafe Auth</h1>" +
    "<p>Infrastructure ready. Run <strong>novasafe-auth-v2 → Deploy AWS</strong>.</p></body></html>",
});
