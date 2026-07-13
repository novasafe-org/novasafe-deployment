/** Placeholder until novasafe-auth-v2 Deploy AWS pushes the real SSR image to ECR. */
export const handler = async () => ({
  statusCode: 200,
  headers: { "content-type": "text/html; charset=utf-8" },
  body: "<!DOCTYPE html><html><body><h1>NovaSafe Auth</h1><p>Infrastructure ready. Run <strong>novasafe-auth-v2 → Deploy AWS</strong> to publish the login app.</p></body></html>",
});
