/** CDK placeholder until novasafe-app-v2 Deploy AWS uploads the real SSR zip. */
export const handler = async () => ({
  statusCode: 503,
  headers: { "content-type": "text/html; charset=utf-8" },
  body:
    "<!DOCTYPE html><html><body><h1>NovaSafe App</h1>" +
    "<p>Infrastructure ready. Run <strong>novasafe-app-v2 → Deploy AWS</strong>.</p></body></html>",
});
